import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { SECURE_APP_LEARN_MORE_URL } from '@/constants'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ChangeSecurityContent } from './ChangeSecurityContent'

export interface VerifyChangeSecurityScreenProps {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.VerifyAppSecurity>
}

/**
 * App Security screen for the Verify stack.
 * Wraps ChangeSecurityContent with Verify stack-specific navigation callbacks.
 */
export const VerifyChangeSecurityScreen = ({ navigation }: VerifyChangeSecurityScreenProps) => {
  const { t } = useTranslation()

  const handleDeviceAuthSuccess = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  const handlePINPress = useCallback(() => {
    navigation.navigate(BCSCScreens.VerifyChangePIN)
  }, [navigation])

  const handleLearnMorePress = useCallback(() => {
    navigation.navigate(BCSCScreens.VerifyWebView, {
      title: t('BCSC.Onboarding.PrivacyPolicyHeaderSecuringApp'),
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
