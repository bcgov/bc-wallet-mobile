import { getBCSCState, selectSecurityMethod } from '@/bcsc-theme/storage/hooks'
import { useAlerts } from '@/hooks/useAlerts'
import { TOKENS, useServices } from '@bifold/core'
import { useNavigation } from '@react-navigation/core'
import { NavigationProp, ParamListBase } from '@react-navigation/native'
import { useCallback } from 'react'
import { withAccount } from '../api/hooks/withAccountGuard'
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
 *   3. Deletes all verification data and tokens from native storage
 *   4. Creates a new IAS registration, writing the new account data
 *
 * A factory reset alert is shown if any error occurs so the user isn't stuck with a broken app
 *
 * @returns {(options?: VerificationResetOptions) => Promise<boolean>} Callback that performs the
 * verification reset and resolves with whether the reset completed successfully
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
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { clearSecureState, deleteVerificationData } = useSecureActions()
  const navigation = useNavigation<NavigationProp<ParamListBase>>()
  const { factoryResetAlert } = useAlerts(navigation)
  const registrationService = useRegistrationService()

  /**
   * Deletes the IAS account associated with the given clientID from the server.
   *
   * @param clientID - The clientID of the account to delete.
   * @returns A promise that resolves when the deletion attempt is complete.
   */
  const deleteRegistration = useCallback(
    async (clientID: string) => {
      try {
        const registrationAccessToken = getBCSCState().account.tokens?.registrationAccessToken

        if (!registrationAccessToken) {
          logger.info('[useVerificationReset]: No registration access token found, skipping IAS account deletion')
          return
        }

        const deleteIASAccount = await registrationService.deleteRegistration(registrationAccessToken, clientID)

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
          const state = getBCSCState()
          const registrationAccessToken = state.account.tokens?.registrationAccessToken
          if (!registrationAccessToken) {
            throw new Error('No registration access token found in store. Cannot proceed with verification reset.')
          }

          logger.info(`[useVerificationReset] Starting renewal reset for account with clientID: ${account.clientID}`)
          // Clear/reset store values
          clearSecureState({
            isHydrated: true, // this is set to true on app load and shouldn't change during the reset
            walletKey: state.session.walletKey,
            // re-registration keeps the same method but only writes it natively, so the store's copy is kept too
            securityMethod: selectSecurityMethod(state),
            // this token is used to clean up other verification data, a new one is saved once the device is registered again
            registrationAccessToken,
            verified: false, // device is no longer verified
            inVerifyFlow, // whether the verify flow stays mounted is the caller's call
          })

          logger.info('[useVerificationReset] Secure state cleared. Deleting IAS registration...')

          // Delete old account registration in IAS
          await deleteRegistration(account.clientID)

          // Delete verification data from native storage (credential, auth request, account flags, additional evidence, tokens)
          await deleteVerificationData()
          await getBCSCState().account.clearTokens()
          logger.info('[useVerificationReset] Verification data and tokens deleted')

          // Register device again with the original security method from the native account record
          logger.info('[useVerificationReset] Creating new IAS registration...')
          const temp = await registrationService.createRegistration(account.securityMethod)
          temp.client_id &&
            logger.info(`[useVerificationReset] New registration created with client_id: ${temp.client_id}`)
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
      logger,
      clearSecureState,
      deleteRegistration,
      deleteVerificationData,
      registrationService,
      factoryResetAlert,
    ]
  )

  return verificationReset
}
