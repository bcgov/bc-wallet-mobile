import useRegistrationApi from '@/bcsc-theme/api/hooks/useRegistrationApi'
import {
  DeviceSecurityResult,
  SecurityMethodSelector,
} from '@/bcsc-theme/features/auth/components/SecurityMethodSelector'
import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { createSecuringAppWebViewJavascriptInjection } from '@/bcsc-theme/utils/webview-utils'
import { SECURE_APP_LEARN_MORE_URL } from '@/constants'
import { TOKENS, useServices } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { AccountSecurityMethod } from 'react-native-bcsc-core'

interface SecureAppScreenProps {
  navigation: StackNavigationProp<BCSCOnboardingStackParams, BCSCScreens.OnboardingSecureApp>
}

/**
 * Secure App screen for onboarding.
 * Provides options for securing the app using biometric authentication or a PIN.
 * Uses the shared SecurityMethodSelector component.
 */
export const SecureAppScreen = ({ navigation }: SecureAppScreenProps): JSX.Element => {
  const { t } = useTranslation()
  const { client, isClientReady } = useBCSCApiClientState()
  const { handleSuccessfulAuth } = useSecureActions()
  const { register } = useRegistrationApi(client, isClientReady)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const handleDeviceAuthSuccess = useCallback(
    async (result: DeviceSecurityResult) => {
      try {
        // Register with device auth security method
        await register(AccountSecurityMethod.DeviceAuth)
        // Complete onboarding with the wallet key
        await handleSuccessfulAuth(result.walletKey)
        logger.info('Device security setup completed successfully')
      } catch (error) {
        const errMessage = error instanceof Error ? error.message : String(error)
        logger.error(`Error completing device security setup: ${errMessage}`)
      }
    },
    [handleSuccessfulAuth, logger, register]
  )

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
      onDeviceAuthSuccess={handleDeviceAuthSuccess}
      onPINPress={handlePINPress}
      onLearnMorePress={handleLearnMorePress}
      deviceAuthPrompt={t('BCSC.Security.AuthenticateToSecure')}
    />
  )
}
