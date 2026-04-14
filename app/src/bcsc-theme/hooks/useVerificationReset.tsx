import { useAlerts } from '@/hooks/useAlerts'
import { BCState, VerificationStatus } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/core'
import { useCallback } from 'react'
import * as BcscCore from 'react-native-bcsc-core'
import { deleteToken, getAccountSecurityMethod, TokenType } from 'react-native-bcsc-core'
import { withAccount } from '../api/hooks/withAccountGuard'
import { useRegistrationService } from '../services/hooks/useRegistrationService'
import { useSecureActions } from './useSecureActions'

/**
 * Returns a hook that resets local verification state and re-registers the
 * device with IAS, keeping the nickname and security method the same.
 * The user will be placed passed the onboarding at Setup Step 2 and will be able to reverify
 *
 * Reset sequence:
 *   1. Clears the in-memory secure store, marking the device as unverified
 *   2. In parallel: fetches the account security method and deletes the existing IAS registration
 *   3. Deletes all verification data and tokens from native storage
 *   4. Creates a new IAS registration, writing the new account data
 *
 * A factory reset alert is shown if any error occurs so the user isn't stuck with a broken app
 *
 * @returns {() => Promise<void>} Callback that performs the verification reset
 */
export const useVerificationReset = () => {
  const [store] = useStore<BCState>()
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
        let registrationAccessToken = store.bcscSecure.registrationAccessToken

        if (!registrationAccessToken) {
          // Note: This allows a verification reset before secure state has been hydrated
          const nativeToken = await BcscCore.getToken(BcscCore.TokenType.Registration)
          registrationAccessToken = nativeToken?.token
        }

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
    [logger, registrationService, store.bcscSecure.registrationAccessToken]
  )

  const verificationReset = useCallback(async () => {
    try {
      await withAccount(async (account) => {
        logger.info(`[useVerificationReset] Starting renewal reset for account with clientID: ${account.clientID}`)
        // Clear/reset store values
        clearSecureState({
          isHydrated: true, // this is set to true on app load and shouldn't change during the reset
          walletKey: store.bcscSecure.walletKey,
          // this token is used to clean up other verification data, a new one is saved once the device is registered again
          registrationAccessToken: store.bcscSecure.registrationAccessToken,
          verified: false, // device is no longer verified
          verifiedStatus: VerificationStatus.UNVERIFIED, // device is no longer verified
        })

        logger.info(
          '[useVerificationReset] Secure state cleared. Deleting IAS registration and fetching security method...'
        )

        const [securityMethod] = await Promise.all([
          // Get original security method for registering the device again
          getAccountSecurityMethod(),
          // Delete old account registration in IAS
          deleteRegistration(account.clientID),
        ])

        // Delete verification data from native storage (credential, auth request, account flags, additional evidence, tokens)
        await deleteVerificationData()
        await Promise.all([
          deleteToken(TokenType.Access),
          deleteToken(TokenType.Refresh),
          deleteToken(TokenType.Registration),
        ])
        logger.info('[useVerificationReset] Verification data and refresh token deleted from native storage')

        // Register device again with original security method
        logger.info('[useVerificationReset] Creating new IAS registration...')
        const temp = await registrationService.createRegistration(securityMethod)
        temp.client_id &&
          logger.info(`[useVerificationReset] New registration created with client_id: ${temp.client_id}`)
        logger.info('[useVerificationReset] New IAS registration created. Renewal reset complete.')
      })
    } catch (error) {
      logger.error('[useVerificationReset] Error during account renewal reset', error as Error)
      factoryResetAlert(error)
    }
  }, [
    store.bcscSecure.registrationAccessToken,
    store.bcscSecure.walletKey,
    logger,
    clearSecureState,
    deleteRegistration,
    deleteVerificationData,
    registrationService,
    factoryResetAlert,
  ])

  return verificationReset
}
