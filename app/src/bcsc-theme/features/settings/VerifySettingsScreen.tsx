import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { SettingsContent } from './SettingsContent'

type VerifySettingsScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.VerifySettings>
}

/**
 * Settings screen for the Verify stack.
 * Wraps SettingsContent with Verify stack-specific navigation callbacks.
 */
export const VerifySettingsScreen: React.FC<VerifySettingsScreenProps> = ({ navigation }) => {
  const onContactUs = () => {
    navigation.navigate(BCSCScreens.VerifyContactUs)
  }

  const onHelp = () => {
    navigation.navigate(BCSCScreens.VerifyHelpCentre)
  }

  const onPrivacy = () => {
    navigation.navigate(BCSCScreens.VerifyPrivacyPolicy)
  }

  const onPressDeveloperMode = () => {
    navigation.navigate(BCSCScreens.VerifyDeveloper)
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
