import { ButtonLocation, IconButton, testIdWithKey, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { t } from 'i18next'

import { a11yLabel } from '@utils/accessibility'
import {
  BCSCAuthStackParams,
  BCSCMainStackParams,
  BCSCOnboardingStackParams,
  BCSCScreens,
  BCSCVerifyStackParams,
} from '../types/navigators'

/**
 * Renders a settings header button that navigates to the appropriate settings screen based on the stack.
 *
 * @param {{
 *   onPress: () => void
 *   testID?: string
 *   accessibilityLabel?: string
 * }} {
 *   onPress,
 *   testID,
 *   accessibilityLabel,
 * }
 * @return {*}
 */
const SettingsHeaderButton = ({
  onPress,
  testID,
  accessibilityLabel,
}: {
  onPress: () => void
  testID?: string
  accessibilityLabel?: string
}) => {
  const { ColorPalette } = useTheme()

  return (
    <IconButton
      buttonLocation={ButtonLocation.Left}
      icon={'menu'}
      iconTintColor={ColorPalette.brand.primary}
      accessibilityLabel={accessibilityLabel || a11yLabel(t('BCSC.Screens.Settings'))}
      testID={testID || testIdWithKey('SettingsMenuButton')}
      onPress={onPress}
    />
  )
}

export default SettingsHeaderButton

/**
 * Creates a Settings Header Button for the Main Stack that navigates to MainSettings.
 */
export const createMainSettingsHeaderButton = () => {
  const MainSettingsHeaderButton = () => {
    const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()

    return <SettingsHeaderButton onPress={() => navigation.navigate(BCSCScreens.MainSettings)} />
  }
  return MainSettingsHeaderButton
}

/**
 * Creates a Settings Header Button for the Verify Stack that navigates to VerifySettings.
 */
export const createVerifySettingsHeaderButton = () => {
  const VerifySettingsHeaderButton = () => {
    const navigation = useNavigation<StackNavigationProp<BCSCVerifyStackParams>>()

    return <SettingsHeaderButton onPress={() => navigation.navigate(BCSCScreens.VerifySettings)} />
  }
  return VerifySettingsHeaderButton
}

/**
 * Creates a Settings Header Button for the Auth Stack that navigates to AuthSettings.
 */
export const createAuthSettingsHeaderButton = () => {
  const AuthSettingsHeaderButton = () => {
    const navigation = useNavigation<StackNavigationProp<BCSCAuthStackParams>>()

    return <SettingsHeaderButton onPress={() => navigation.navigate(BCSCScreens.AuthSettings)} />
  }
  return AuthSettingsHeaderButton
}

/**
 * Creates a Settings Header Button for the Onboarding Stack that navigates to OnboardingSettings.
 *
 * @return {*}
 */
export const createOnboardingSettingsHeaderButton = () => {
  const OnboardingSettingsHeaderButton = () => {
    const navigation = useNavigation<StackNavigationProp<BCSCOnboardingStackParams>>()

    return <SettingsHeaderButton onPress={() => navigation.navigate(BCSCScreens.OnboardingSettings)} />
  }
  return OnboardingSettingsHeaderButton
}
