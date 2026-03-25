import { useAlerts } from '@/hooks/useAlerts'
import { BCState, VerificationStatus } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/core'
import { useCallback } from 'react'
import { deleteToken, getAccountSecurityMethod, TokenType } from 'react-native-bcsc-core'
import { withAccount } from '../api/hooks/withAccountGuard'
import { useRegistrationService } from '../services/hooks/useRegistrationService'
import { useSecureActions } from './useSecureActions'

export const useRenewAccount = () => {
  const [store] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { clearSecureState, deleteVerificationData } = useSecureActions()
  const navigation = useNavigation<NavigationProp<ParamListBase>>()
  const { factoryResetAlert } = useAlerts(navigation)
  const registrationService = useRegistrationService()

  const renewAccount = useCallback(async () => {
    try {
      await withAccount(async (account) => {
        logger.info(`[useRenewalReset] Starting renewal reset for account with clientID: ${account.clientID}`)
        // Clear/reset store values
        clearSecureState({
          isHydrated: true,
          walletKey: store.bcscSecure.walletKey,
          registrationAccessToken: store.bcscSecure.registrationAccessToken,
          savedServices: store.bcscSecure.savedServices,
          verified: false,
          verifiedStatus: VerificationStatus.UNVERIFIED,
        })

        logger.info('[useRenewalReset] Secure state cleared. Deleting IAS registration and fetching security method...')

        const [securityMethod, deleteResult] = await Promise.all([
          // Get original security method for registering the device again
          getAccountSecurityMethod(),
          // Delete old account registration in IAS
          registrationService.deleteRegistration(account.clientID),
        ])

        logger.info(
          `[useRenewalReset] IAS registration deleted (success=${deleteResult.success}), securityMethod=${securityMethod}`
        )

        // Delete verification data from native storage (credential, auth request, account flags, additional evidence, tokens)
        await deleteVerificationData()
        await Promise.all([
          deleteToken(TokenType.Access),
          deleteToken(TokenType.Refresh),
          deleteToken(TokenType.Registration),
        ])
        logger.info('[useRenewalReset] Verification data and refresh token deleted from native storage')

        // Register device again with original security method
        logger.info('[useRenewalReset] Creating new IAS registration...')
        const temp = await registrationService.createRegistration(securityMethod)
        temp.client_id && logger.info(`[useRenewalReset] New registration created with client_id: ${temp.client_id}`)
        logger.info('[useRenewalReset] New IAS registration created. Renewal reset complete.')
      })
    } catch (error) {
      logger.error('[useRenewalReset] Error during account renewal reset', error as Error)
      factoryResetAlert()
    }
  }, [
    clearSecureState,
    deleteVerificationData,
    factoryResetAlert,
    logger,
    store.bcscSecure.walletKey,
    store.bcscSecure.registrationAccessToken,
    store.bcscSecure.savedServices,
    registrationService,
  ])

  return renewAccount
}
