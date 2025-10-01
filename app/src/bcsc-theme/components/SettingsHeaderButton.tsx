import { ButtonLocation, IconButton, testIdWithKey } from '@bifold/core'
import { t } from 'i18next'
import { BCSCRootStackParams, BCSCScreens } from '../types/navigators'
import { StackNavigationProp } from '@react-navigation/stack'
import { useNavigation } from '@react-navigation/native'

type SettingsHeaderButtonNavigationProp = StackNavigationProp<BCSCRootStackParams, BCSCScreens.Settings>

/**
 * Creates a Settings Header Button component that navigates to the Settings screen.
 *
 * Note: This is a curried function to avoid re-rendering in navigation stacks.
 *
 * @returns {*} {React.FC<SettingsHeaderButtonProps>} A React functional component that renders the Settings Header Button.
 */
export const createSettingsHeaderButton = () => {
  const SettingsHeaderButton = () => {
    const navigation = useNavigation<SettingsHeaderButtonNavigationProp>()

    return (
      <IconButton
        buttonLocation={ButtonLocation.Left}
        icon={'menu'}
        accessibilityLabel={t('Settings.MenuButton')}
        testID={testIdWithKey('SettingsMenuButton')}
        onPress={() => {
          navigation.navigate(BCSCScreens.Settings)
        }}
      />
    )
  }

  return SettingsHeaderButton
}
