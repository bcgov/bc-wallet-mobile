import { useBCSCApiClient } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { TOKENS, useServices, useTheme } from '@bifold/core'
import React, { useCallback } from 'react'
import { ActivityIndicator, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import type { WebViewErrorEvent, WebViewHttpErrorEvent } from 'react-native-webview/lib/WebViewTypes'

interface WebViewContentProps {
  url: string
  injectedJavascript?: string
  // TODO (MD): onLoad - callback to fire when webview has finished loading?
}

/**
 * A WebView component that loads a given URL with optional injected JavaScript.
 *
 * @param {WebViewContentProps} props - The component props.
 * @returns {*} {JSX.Element} The rendered WebView component.
 */
const WebViewContent: React.FC<WebViewContentProps> = ({ url, injectedJavascript }) => {
  const { ColorPalette } = useTheme()
  const client = useBCSCApiClient()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    webview: {
      flex: 1,
    },
  })

  // //TODO(bm): This checks if this is the "My Devices" endpoint - don't apply theming for it
  // // in future we should update the themed webview script to handle the styles on the my devices page as well
  // const isMyDevicesEndpoint = url.includes('/account/embedded/devices')

  const handleError = useCallback(
    (syntheticEvent: WebViewErrorEvent) => {
      const { nativeEvent } = syntheticEvent
      logger.error('WebView Error:', { ...nativeEvent })
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

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <WebView
        source={{
          uri: url,
          headers: { Authorization: `Bearer ${client.tokens?.access_token}` },
        }}
        style={styles.webview}
        startInLoadingState={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsBackForwardNavigationGestures={true}
        renderLoading={() => (
          <SafeAreaView style={{ flex: 1, backgroundColor: ColorPalette.brand.primaryBackground }}>
            <ActivityIndicator size={'large'} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />
          </SafeAreaView>
        )}
        onError={handleError}
        onHttpError={handleHttpError}
        originWhitelist={['*']}
        mixedContentMode="compatibility"
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        userAgent="Single App"
        injectedJavaScriptBeforeContentLoaded={injectedJavascript}
        onMessage={() => {}} // Required for injectedJavaScript to work
      />
    </SafeAreaView>
  )
}

export { WebViewContent }
