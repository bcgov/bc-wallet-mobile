import { BCSCAuthStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { HELP_URL } from '@/constants'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { SettingsContent } from './SettingsContent'

type AuthSettingsScreenProps = {
  navigation: StackNavigationProp<BCSCAuthStackParams, BCSCScreens.AuthSettings>
}

/**
 * Settings screen for the Auth stack.
 * Wraps SettingsContent with Auth stack-specific navigation callbacks.
 */
export const AuthSettingsScreen: React.FC<AuthSettingsScreenProps> = ({ navigation }) => {
  const { t } = useTranslation()

  const onContactUs = () => {
    navigation.navigate(BCSCScreens.AuthContactUs)
  }

  const onHelp = () => {
    navigation.navigate(BCSCScreens.AuthWebView, {
      url: HELP_URL,
      title: t('BCSC.Screens.HelpCentre'),
    })
  }

  const onPrivacy = () => {
    navigation.navigate(BCSCScreens.AuthPrivacyPolicy)
  }

  const onPressDeveloperMode = () => {
    navigation.navigate(BCSCScreens.AuthDeveloper)
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
