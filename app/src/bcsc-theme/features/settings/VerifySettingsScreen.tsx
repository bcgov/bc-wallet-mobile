import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { HELP_URL } from '@/constants'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { SettingsContent } from './SettingsContent'

type VerifySettingsScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.VerifySettings>
}

/**
 * Settings screen for the Verify stack.
 * Wraps SettingsContent with Verify stack-specific navigation callbacks.
 */
export const VerifySettingsScreen: React.FC<VerifySettingsScreenProps> = ({ navigation }) => {
  const { t } = useTranslation()

  const onContactUs = () => {
    navigation.navigate(BCSCScreens.VerifyContactUs)
  }

  const onHelp = () => {
    navigation.navigate(BCSCScreens.VerifyWebView, {
      url: HELP_URL,
      title: t('BCSC.Screens.HelpCentre'),
    })
  }

  const onPrivacy = () => {
    navigation.navigate(BCSCScreens.VerifyPrivacyPolicy)
  }

  const onPressDeveloperMode = () => {
    navigation.navigate(BCSCScreens.VerifyDeveloper)
  }

  const onAutoLock = () => {
    navigation.navigate(BCSCScreens.VerifyAutoLock)
  }

  const onAppSecurity = () => {
    navigation.navigate(BCSCScreens.VerifyAppSecurity)
  }

  const onChangePIN = () => {
    navigation.navigate(BCSCScreens.VerifyChangePIN, { isChangingExistingPIN: true })
  }

  return (
    <SettingsContent
      onContactUs={onContactUs}
      onHelp={onHelp}
      onPrivacy={onPrivacy}
      onPressDeveloperMode={onPressDeveloperMode}
      onAutoLock={onAutoLock}
      onAppSecurity={onAppSecurity}
      onChangePIN={onChangePIN}
    />
  )
}
