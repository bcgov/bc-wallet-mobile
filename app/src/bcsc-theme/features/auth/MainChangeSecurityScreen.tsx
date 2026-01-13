import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { createSecuringAppWebViewJavascriptInjection } from '@/bcsc-theme/utils/webview-utils'
import { SECURE_APP_LEARN_MORE_URL } from '@/constants'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ChangeSecurityContent } from './ChangeSecurityContent'

export interface MainChangeSecurityScreenProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.MainAppSecurity>
}

/**
 * App Security screen for the Main stack.
 * Wraps ChangeSecurityContent with Main stack-specific navigation callbacks.
 */
export const MainChangeSecurityScreen = ({ navigation }: MainChangeSecurityScreenProps) => {
  const { t } = useTranslation()

  const handleDeviceAuthSuccess = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  const handlePINPress = useCallback(() => {
    navigation.navigate(BCSCScreens.MainChangePIN)
  }, [navigation])

  const handleLearnMorePress = useCallback(() => {
    navigation.navigate(BCSCScreens.MainWebView, {
      title: t('BCSC.Onboarding.PrivacyPolicyHeaderSecuringApp'),
      injectedJavascript: createSecuringAppWebViewJavascriptInjection(),
      url: SECURE_APP_LEARN_MORE_URL,
    })
  }, [navigation, t])

  return (
    <ChangeSecurityContent
      onDeviceAuthSuccess={handleDeviceAuthSuccess}
      onPINPress={handlePINPress}
      onLearnMorePress={handleLearnMorePress}
    />
  )
}
