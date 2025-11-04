import { ButtonLocation, IconButton, testIdWithKey } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { t } from 'i18next'
import { BCSCMainStackParams, BCSCScreens, BCSCVerifyStackParams } from '../types/navigators'

/**
 * Creates a Settings Header Button for the Main Stack that navigates to MainSettings.
 */
export const createMainSettingsHeaderButton = () => {
  const MainSettingsHeaderButton = () => {
    const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()

    return (
      <IconButton
        buttonLocation={ButtonLocation.Left}
        icon={'menu'}
        accessibilityLabel={t('Settings.ButtonTitle')}
        testID={testIdWithKey('SettingsMenuButton')}
        onPress={() => navigation.navigate(BCSCScreens.MainSettings)}
      />
    )
  }
  return MainSettingsHeaderButton
}

/**
 * Creates a Settings Header Button for the Verify Stack that navigates to VerifySettings.
 */
export const createVerifySettingsHeaderButton = () => {
  const VerifySettingsHeaderButton = () => {
    const navigation = useNavigation<StackNavigationProp<BCSCVerifyStackParams>>()

    return (
      <IconButton
        buttonLocation={ButtonLocation.Left}
        icon={'menu'}
        accessibilityLabel={t('Settings.ButtonTitle')}
        testID={testIdWithKey('SettingsMenuButton')}
        onPress={() => navigation.navigate(BCSCScreens.VerifySettings)}
      />
    )
  }
  return VerifySettingsHeaderButton
}
