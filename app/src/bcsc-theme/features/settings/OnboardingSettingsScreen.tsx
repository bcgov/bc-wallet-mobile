import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { HelpCentreUrl } from '@/constants'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { SettingsContent } from './SettingsContent'

type OnboardingSettingsScreenProps = {
  navigation: StackNavigationProp<BCSCOnboardingStackParams, BCSCScreens.OnboardingSettings>
}

/**
 * Settings screen for the Onboarding stack.
 * Wraps SettingsContent with Onboarding stack-specific navigation callbacks.
 */
export const OnboardingSettingsScreen: React.FC<OnboardingSettingsScreenProps> = ({ navigation }) => {
  const { t } = useTranslation()

  const onContactUs = () => {
    navigation.navigate(BCSCScreens.OnboardingWebView, {
      url: HelpCentreUrl.CONTACT_US,
      title: t('BCSC.Screens.ContactUs'),
    })
  }

  const onHelp = () => {
    navigation.navigate(BCSCScreens.OnboardingWebView, {
      url: HelpCentreUrl.HOME,
      title: t('BCSC.Screens.HelpCentre'),
    })
  }

  const onPrivacy = () => {
    navigation.navigate(BCSCScreens.OnboardingPrivacyInformation)
  }

  const onPressDeveloperMode = () => {
    navigation.navigate(BCSCScreens.OnboardingDeveloper)
  }

  return (
    <SettingsContent
      onContactUs={onContactUs}
      onHelp={onHelp}
      onPrivacy={onPrivacy}
      onPressDeveloperMode={onPressDeveloperMode}
    />
  )
}
