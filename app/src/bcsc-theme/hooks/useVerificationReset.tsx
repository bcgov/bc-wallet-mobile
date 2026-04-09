import { useAlerts } from '@/hooks/useAlerts'
import { BCState, VerificationStatus } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/core'
import { useCallback } from 'react'
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

  const verificationReset = useCallback(async () => {
    try {
      await withAccount(async (account) => {
        if (!store.bcscSecure.registrationAccessToken) {
          throw new Error('No registration access token found in store. Cannot proceed with verification reset.')
        }

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

        const [securityMethod, deleteResult] = await Promise.all([
          // Get original security method for registering the device again
          getAccountSecurityMethod(),
          // Delete old account registration in IAS
          registrationService.deleteRegistration(store.bcscSecure.registrationAccessToken, account.clientID),
        ])

        logger.info(
          `[useVerificationReset] IAS registration deleted (success=${deleteResult.success}), securityMethod=${securityMethod}`
        )

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
    clearSecureState,
    deleteVerificationData,
    factoryResetAlert,
    logger,
    store.bcscSecure.walletKey,
    store.bcscSecure.registrationAccessToken,
    registrationService,
  ])

  return verificationReset
}
