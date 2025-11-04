import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { SettingsContent } from './SettingsContent'

type MainSettingsScreenProps = {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.MainSettings>
}

/**
 * Settings screen for the Main stack.
 * Wraps SettingsContent with Main stack-specific navigation callbacks.
 */
export const MainSettingsScreen: React.FC<MainSettingsScreenProps> = ({ navigation }) => {
  const onContactUs = () => {
    navigation.navigate(BCSCScreens.MainContactUs)
  }

  const onHelp = () => {
    navigation.navigate(BCSCScreens.MainHelpCentre)
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

  return (
    <SettingsContent
      onContactUs={onContactUs}
      onHelp={onHelp}
      onPrivacy={onPrivacy}
      onPressDeveloperMode={onPressDeveloperMode}
      onEditNickname={onEditNickname}
      onForgetAllPairings={onForgetAllPairings}
    />
  )
}
