import useRegistrationApi from '@/bcsc-theme/api/hooks/useRegistrationApi'
import { SecurityMethodSelector } from '@/bcsc-theme/features/auth/components/SecurityMethodSelector'
import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { createSecuringAppWebViewJavascriptInjection } from '@/bcsc-theme/utils/webview-utils'
import { SECURE_APP_LEARN_MORE_URL } from '@/constants'
import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { TOKENS, useServices } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { AccountSecurityMethod, BcscNativeErrorCodes, isBcscNativeError, setupDeviceSecurity } from 'react-native-bcsc-core'

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
  const { client, isClientReady } = useBCSCApiClientState()
  const { handleSuccessfulAuth } = useSecureActions()
  const { register } = useRegistrationApi(client, isClientReady)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { emitError } = useErrorAlert()

  const handleDeviceAuthPress = useCallback(async () => {
    try {
      // IMPORTANT: register() must be called FIRST to create the account
      // setupDeviceSecurity() requires an account to already exist
      await register(AccountSecurityMethod.DeviceAuth)

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
      if (isBcscNativeError(error) && error.code === BcscNativeErrorCodes.KEYPAIR_GENERATION_FAILED) {
        emitError('KEYPAIR_GENERATION_ERROR', { error })
      }
      const errMessage = error instanceof Error ? error.message : String(error)
      logger.error(`Error completing device security setup: ${errMessage}`)
    }
  }, [handleSuccessfulAuth, logger, register, emitError])

  const handlePINPress = useCallback(() => {
    navigation.navigate(BCSCScreens.OnboardingCreatePIN)
  }, [navigation])

  const handleLearnMorePress = useCallback(() => {
    navigation.navigate(BCSCScreens.OnboardingWebView, {
      title: t('BCSC.Onboarding.PrivacyPolicyHeaderSecuringApp'),
      injectedJavascript: createSecuringAppWebViewJavascriptInjection(),
      url: SECURE_APP_LEARN_MORE_URL,
    })
  }, [navigation, t])

  return (
    <SecurityMethodSelector
      onDeviceAuthPress={handleDeviceAuthPress}
      onPINPress={handlePINPress}
      onLearnMorePress={handleLearnMorePress}
      deviceAuthPrompt={t('BCSC.Security.AuthenticateToSecure')}
    />
  )
}
