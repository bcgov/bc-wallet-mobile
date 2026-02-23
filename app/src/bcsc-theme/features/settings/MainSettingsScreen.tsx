import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { HELP_URL } from '@/constants'
import { useAlerts } from '@/hooks/useAlerts'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { SettingsContent } from './SettingsContent'

type MainSettingsScreenProps = {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.MainSettings>
}

/**
 * Settings screen for the Main stack.
 * Wraps SettingsContent with Main stack-specific navigation callbacks.
 */
export const MainSettingsScreen: React.FC<MainSettingsScreenProps> = ({ navigation }) => {
  const { t } = useTranslation()
  const alerts = useAlerts(navigation)

  const onContactUs = () => {
    navigation.navigate(BCSCScreens.MainContactUs)
  }

  const onHelp = () => {
    navigation.navigate(BCSCScreens.MainWebView, {
      url: HELP_URL,
      title: t('BCSC.Screens.HelpCentre'),
    })
  }

  const onPrivacy = () => {
    navigation.navigate(BCSCScreens.MainPrivacyPolicy)
  }

  const onPressDeveloperMode = () => {
    navigation.navigate(BCSCScreens.MainDeveloper)
  }

  const onEditNickname = () => {
    navigation.navigate(BCSCScreens.EditNickname)
  }

  const onForgetAllPairings = () => {
    navigation.navigate(BCSCScreens.ForgetAllPairings)
  }

  const onAutoLock = () => {
    navigation.navigate(BCSCScreens.MainAutoLock)
  }

  const onAppSecurity = () => {
    navigation.navigate(BCSCScreens.MainAppSecurity)
  }

  const onChangePIN = () => {
    navigation.navigate(BCSCScreens.MainChangePIN, { isChangingExistingPIN: true })
  }

  return (
    <SettingsContent
      onContactUs={onContactUs}
      onHelp={onHelp}
      onPrivacy={onPrivacy}
      onPressDeveloperMode={onPressDeveloperMode}
      onEditNickname={onEditNickname}
      onForgetAllPairings={onForgetAllPairings}
      onAutoLock={onAutoLock}
      onAppSecurity={onAppSecurity}
      onChangePIN={onChangePIN}
      onRemoveAccount={alerts.removeAccountAlert}
    />
  )
}
