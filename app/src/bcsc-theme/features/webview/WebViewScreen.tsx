import React, { useCallback } from 'react'
import { StyleSheet } from 'react-native'
import { WebView } from 'react-native-webview'
import type { WebViewErrorEvent, WebViewHttpErrorEvent } from 'react-native-webview/lib/WebViewTypes'
import { SafeAreaView } from 'react-native-safe-area-context'
import { TOKENS, useServices, useTheme } from '@bifold/core'
import { RouteProp } from '@react-navigation/native'
import { BCSCRootStackParams, BCSCScreens } from '../../types/navigators'
import client from '@/bcsc-theme/api/client'

export interface WebViewScreenProps {
  route: RouteProp<BCSCRootStackParams, BCSCScreens.WebView>
}

const WebViewScreen: React.FC<WebViewScreenProps> = ({ route }) => {
  const { ColorPalette } = useTheme()
  const { url } = route.params
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const handleError = useCallback(
    (syntheticEvent: WebViewErrorEvent) => {
      const { nativeEvent } = syntheticEvent
      logger.error('WebView Error:', nativeEvent)
    },
    [logger]
  )

  const handleHttpError = useCallback(
    (syntheticEvent: WebViewHttpErrorEvent) => {
      const { nativeEvent } = syntheticEvent
      logger.error('WebView HTTP Error:', {
        url: nativeEvent.url,
        statusCode: nativeEvent.statusCode,
        description: nativeEvent.description,
      })
    },
    [logger]
  )

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    webview: {
      flex: 1,
    },
  })

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <WebView
        source={{ uri: url, headers: { Authorization: `Bearer ${client.tokens?.access_token}` } }}
        style={styles.webview}
        startInLoadingState={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsBackForwardNavigationGestures={true}
        onError={handleError}
        onHttpError={handleHttpError}
        originWhitelist={['*']}
        mixedContentMode="compatibility"
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        userAgent="Single App"
      />
    </SafeAreaView>
  )
}

export default WebViewScreen
