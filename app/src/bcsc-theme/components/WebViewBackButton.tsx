import { HeaderBackButton, HeaderBackButtonProps } from '@react-navigation/elements'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'

/**
 * Creates a generic custom back button for webview headers.
 *
 * Note: This is a curried function to avoid re-rendering in navigation stacks.
 *
 * @template TParamList - The parameter list type for the navigation stack
 * @param {StackNavigationProp<TParamList>} navigation - The navigation prop for the webview screen.
 * @returns {React.FC<HeaderBackButtonProps>} A React functional component that renders the custom back button.
 */
export const createWebviewHeaderBackButton = <TParamList extends Record<string, object | undefined>>(
  navigation: StackNavigationProp<TParamList>
) => {
  // Declared so that it has a display name for debugging purposes
  const HeaderLeft = (props: HeaderBackButtonProps) => {
    const handleBackPress = async () => {
      navigation.goBack()
    }

    return <HeaderBackButton {...props} onPress={handleBackPress} />
  }
  return HeaderLeft
}
