import { ButtonLocation, IconButton, testIdWithKey } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { t } from 'i18next'

/**
 * Creates a generic Settings Header Button component that navigates to the specified settings screen.
 *
 * Note: This is a curried function to avoid re-rendering in navigation stacks.
 *
 * @template TParamList - The parameter list type for the navigation stack
 * @param {keyof TParamList} screenName - The screen name to navigate to
 * @returns {React.FC} A React functional component that renders the Settings Header Button.
 */
export const createSettingsHeaderButton = <TParamList extends Record<string, object | undefined>>(
  screenName: keyof TParamList
) => {
  const SettingsHeaderButton = () => {
    const navigation = useNavigation<StackNavigationProp<TParamList>>()

    return (
      <IconButton
        buttonLocation={ButtonLocation.Left}
        icon={'menu'}
        accessibilityLabel={t('Settings.ButtonTitle')}
        testID={testIdWithKey('SettingsMenuButton')}
        onPress={() => {
          // TypeScript can't infer the exact parameter types for generic navigation
          // but we know this is safe because screenName is constrained to keyof TParamList
          navigation.navigate(screenName as never)
        }}
      />
    )
  }

  return SettingsHeaderButton
}
