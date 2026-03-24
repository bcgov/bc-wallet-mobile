import { useAlerts } from '@/hooks/useAlerts'
import { BCState, VerificationStatus } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/core'
import { useCallback } from 'react'
import { getAccountSecurityMethod } from 'react-native-bcsc-core'
import { withAccount } from '../api/hooks/withAccountGuard'
import { useRegistrationService } from '../services/hooks/useRegistrationService'
import { useSecureActions } from './useSecureActions'

export const useRenewalReset = () => {
  const [store] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { clearSecureState, deleteVerificationData } = useSecureActions()
  const navigation = useNavigation<NavigationProp<ParamListBase>>()
  const { factoryResetAlert } = useAlerts(navigation)
  const registrationService = useRegistrationService()

  const renewAccount = useCallback(async () => {
    try {
      await withAccount(async (account) => {
        // Clear/reset store values
        clearSecureState({
          isHydrated: true,
          walletKey: store.bcscSecure.walletKey,
          registrationAccessToken: store.bcscSecure.registrationAccessToken,
          savedServices: store.bcscSecure.savedServices,
          verified: false,
          verifiedStatus: VerificationStatus.UNVERIFIED,
        })

        const [securityMethod] = await Promise.all([
          // Get original security method for registering the device again
          getAccountSecurityMethod(),
          // Delete old account registration in IAS
          registrationService.deleteRegistration(account.clientID),
        ])

        // Delete verification data from native storage (credential, auth request, account flags, additional evidence)
        await deleteVerificationData()

        // Register device again with original security method
        await registrationService.createRegistration(securityMethod)
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
