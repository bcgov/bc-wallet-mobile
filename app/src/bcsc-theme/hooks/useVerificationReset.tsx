import { useAlerts } from '@/hooks/useAlerts'
import { BCDispatchAction, BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useNavigation } from '@react-navigation/core'
import { NavigationProp, ParamListBase } from '@react-navigation/native'
import { useCallback } from 'react'
import { deleteToken, TokenType } from 'react-native-bcsc-core'
import { withAccount } from '../api/hooks/withAccountGuard'
import { DeviceRegistration, readDeviceRegistration } from '../services/device-registration'
import { useRegistrationService } from '../services/hooks/useRegistrationService'
import { useSecureActions } from './useSecureActions'

/**
 * Returns a hook that resets local verification state and re-registers the
 * device with IAS, keeping the nickname and security method the same.
 * The user will be placed passed the onboarding at Setup Step 2 and will be able to reverify
 *
 * Reset sequence:
 *   1. Clears the in-memory secure store, marking the device as unverified. This happens before the
 *      native deletes, so if one fails the surviving record is read back at the next unlock
 *   2. Deletes the existing IAS registration
 *   3. Deletes all verification data and the access and refresh tokens from native storage
 *   4. Clears the old registration from the device (client ID and registration access token together)
 *   5. Clears the saved account details, which describe the registration just deleted
 *   6. Creates a new IAS registration, saving its client ID and token together
 *
 * If step 6 fails the account is left with no registration, not with a client ID IAS has deleted, so
 * the next verification step registers it again.
 *
 * A factory reset alert is shown if any error occurs so the user isn't stuck with a broken app
 */
export type VerificationResetOptions = {
  /**
   * Whether the device is left in the verify flow. False (default) unmounts the flow, for a restart that
   * re-enters it or a cancelled review that leaves it. True keeps the flow mounted, for a reset that
   * happens inside it (backing out of identity selection pops to the setup question).
   */
  inVerifyFlow?: boolean
}

export const useVerificationReset = () => {
  const [store, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { clearSecureState, clearRegistration, deleteVerificationData } = useSecureActions()
  const navigation = useNavigation<NavigationProp<ParamListBase>>()
  const { factoryResetAlert } = useAlerts(navigation)
  const registrationService = useRegistrationService()

  /**
   * Deletes the device's registration from the IAS server. A failed delete is logged, not thrown.
   */
  const deleteRegistration = useCallback(
    async (registration: DeviceRegistration) => {
      try {
        const deleteIASAccount = await registrationService.deleteRegistration(
          registration.registrationAccessToken,
          registration.clientId
        )

        if (!deleteIASAccount.success) {
          logger.warn('[useVerificationReset]: Failed to delete IAS account from server')
        }
      } catch (error) {
        logger.warn('[useVerificationReset]: Error occurred while deleting registration', { error })
      }
    },
    [logger, registrationService]
  )

  const verificationReset = useCallback(
    async ({ inVerifyFlow = false }: VerificationResetOptions = {}): Promise<boolean> => {
      try {
        await withAccount(async (account) => {
          // Read from storage, so the client ID and the token are the pair the device holds now
          const registration = await readDeviceRegistration(account)

          if (!registration) {
            throw new Error('No registration access token found on the device. Cannot proceed with verification reset.')
          }

          logger.info('[useVerificationReset] Starting renewal reset')
          clearSecureState({
            isHydrated: true, // this is set to true on app load and shouldn't change during the reset
            walletKey: store.bcscSecure.walletKey,
            // the account keeps its security method through the reset, so the store's copy is kept too
            securityMethod: store.bcscSecure.securityMethod,
            // the registration is still on the device until it is cleared below, which also drops this token
            registrationAccessToken: registration.registrationAccessToken,
            verified: false, // device is no longer verified
            inVerifyFlow, // whether the verify flow stays mounted is the caller's call
          })

          logger.info('[useVerificationReset] Secure state cleared. Deleting IAS registration...')

          await deleteRegistration(registration)

          // Delete verification data from native storage (credential, auth request, account flags, additional evidence, tokens)
          await deleteVerificationData()
          await Promise.all([deleteToken(TokenType.Access), deleteToken(TokenType.Refresh)])
          // After the other tokens: iOS stores them under the client ID this clears
          await clearRegistration()
          logger.info('[useVerificationReset] Verification data, tokens and registration deleted from native storage')

          // After the deletes succeed: if one fails, the record or token read back at the next unlock
          // still carries its expiry reason. Not in CLEAR_SECURE_STATE, which lock and logout share.
          dispatch({ type: BCDispatchAction.UPDATE_CREDENTIAL_METADATA, payload: [undefined] })

          // Register the device again. The account keeps its security method and nickname.
          logger.info('[useVerificationReset] Creating new IAS registration...')
          await registrationService.createRegistration()
          logger.info('[useVerificationReset] New IAS registration created. Renewal reset complete.')
        })

        return true
      } catch (error) {
        logger.error('[useVerificationReset] Error during account renewal reset', error as Error)
        factoryResetAlert(error)
        return false
      }
    },
    [
      store.bcscSecure.walletKey,
      store.bcscSecure.securityMethod,
      dispatch,
      logger,
      clearSecureState,
      clearRegistration,
      deleteRegistration,
      deleteVerificationData,
      registrationService,
      factoryResetAlert,
    ]
  )

  return verificationReset
}
