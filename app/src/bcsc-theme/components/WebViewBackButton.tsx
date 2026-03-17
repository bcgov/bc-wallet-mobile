import { HeaderBackButton, HeaderBackButtonProps } from '@react-navigation/elements'
import { useNavigation } from '@react-navigation/native'
import React from 'react'

/**
 * Creates a custom back button for webview headers that navigates back.
 */
export const createWebviewHeaderBackButton = () => {
  const WebViewHeaderLeft = (props: HeaderBackButtonProps) => {
    const navigation = useNavigation()
    const handleBackPress = async () => {
      navigation.goBack()
    }

    return <HeaderBackButton {...props} onPress={handleBackPress} />
  }
  return WebViewHeaderLeft
}
