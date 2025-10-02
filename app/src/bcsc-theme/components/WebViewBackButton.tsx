import { HeaderBackButton, HeaderBackButtonProps } from '@react-navigation/elements'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { BCSCRootStackParams, BCSCScreens } from '../types/navigators'

/**
 * Creates a custom back button for webview headers that refreshes device count on back press.
 *
 * Note: This is a curried function to avoid re-rendering in navigation stacks.
 *
 * @param {StackNavigationProp<BCSCRootStackParams, BCSCScreens.WebView>} navigation - The navigation prop for the webview screen.
 * @returns {React.FC<HeaderBackButtonProps>} A React functional component that renders the custom back button.
 */
export const createWebviewHeaderBackButton = (
  navigation: StackNavigationProp<BCSCRootStackParams, BCSCScreens.WebView>
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
