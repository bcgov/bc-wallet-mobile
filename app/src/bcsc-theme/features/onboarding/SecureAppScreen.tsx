import { SecurityMethodSelector } from '@/bcsc-theme/features/auth/components/SecurityMethodSelector'
import { useBCSCApiClient } from '@/bcsc-theme/hooks/useBCSCApiClient'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { toAppError } from '@/bcsc-theme/utils/native-error-map'
import { TEMPORARY_ACCOUNT_CLIENT_ID } from '@/constants'
import { ErrorRegistry } from '@/errors/errorRegistry'
import { TOKENS, useServices } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { AccountSecurityMethod, setAccount, setupDeviceSecurity } from 'react-native-bcsc-core'

interface SecureAppScreenProps {
  navigation: StackNavigationProp<BCSCOnboardingStackParams, BCSCScreens.OnboardingSecureApp>
}

/**
 * Secure App screen for onboarding.
 * Provides options for securing the app using biometric authentication or a PIN.
 * Uses the shared SecurityMethodSelector component.
 */
export const SecureAppScreen = ({ navigation }: SecureAppScreenProps): React.ReactElement => {
  const { t } = useTranslation()
  const { handleSuccessfulAuth } = useSecureActions()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const client = useBCSCApiClient()

  const handleDeviceAuthPress = useCallback(async () => {
    try {
      // IMPORTANT: Account must exist before setting up device security.
      await setAccount({
        clientID: TEMPORARY_ACCOUNT_CLIENT_ID,
        issuer: client.endpoints.issuer,
        securityMethod: AccountSecurityMethod.DeviceAuth,
      })

      // Now setup device security (generates random PIN and stores it securely)
      const { success, walletKey } = await setupDeviceSecurity()
      if (success) {
        // Complete onboarding with the wallet key
        await handleSuccessfulAuth(walletKey)
        logger.info('Device security setup completed successfully')
      } else {
        logger.error('Device security setup failed')
      }
    } catch (error) {
      const appError = toAppError(error, ErrorRegistry.DEVICE_AUTHORIZATION_ERROR)
      logger.error(`Error completing device security setup: ${appError.technicalMessage ?? appError.message}`)
    }
  }, [client.endpoints.issuer, handleSuccessfulAuth, logger])

  const handlePINPress = useCallback(() => {
    navigation.navigate(BCSCScreens.OnboardingCreatePIN)
  }, [navigation])

  return (
    <SecurityMethodSelector
      onDeviceAuthPress={handleDeviceAuthPress}
      onPINPress={handlePINPress}
      deviceAuthPrompt={t('BCSC.Security.AuthenticateToSecure')}
    />
  )
}
