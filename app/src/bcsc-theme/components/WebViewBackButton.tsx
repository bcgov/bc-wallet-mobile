import { StackNavigationProp } from '@react-navigation/stack'
import { BCSCRootStackParams, BCSCScreens } from '../types/navigators'
import { HeaderBackButton, HeaderBackButtonProps } from '@react-navigation/elements'
import { useStore } from '@bifold/core'
import { BCDispatchAction, BCState } from '@/store'
import client from '../api/client'
import React from 'react'

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
    const [, dispatch] = useStore<BCState>()
    const handleBackPress = async () => {
      // navigate back before refreshing to avoid blocking the UI
      navigation.goBack()

      // Refresh when leaving webviews in case account / device action was taken within the webview
      if (client.tokens?.refresh_token) {
        const tokenData = await client.getTokensForRefreshToken(client.tokens?.refresh_token)

        if (tokenData.bcsc_devices_count !== undefined) {
          dispatch({
            type: BCDispatchAction.UPDATE_DEVICE_COUNT,
            payload: [tokenData.bcsc_devices_count],
          })
        }
      }
    }

    return <HeaderBackButton {...props} onPress={handleBackPress} />
  }
  return HeaderLeft
}
