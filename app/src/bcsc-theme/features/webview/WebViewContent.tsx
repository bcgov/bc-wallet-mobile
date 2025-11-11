import { useBCSCApiClient } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { TOKENS, useServices, useTheme } from '@bifold/core'
import React, { useCallback } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { WebView } from 'react-native-webview'
import type { WebViewErrorEvent, WebViewHttpErrorEvent } from 'react-native-webview/lib/WebViewTypes'

interface WebViewContentProps {
  /**
   * The URL to load in the WebView.
   *
   * @type {string}
   */
  url: string
  /**
   * Optional callback function that is called when the WebView has finished loading.
   *
   * @type {() => void}
   */
  onLoaded?: () => void
  /**
   * Optional JavaScript code to inject into the WebView before content loads.
   * Why? This is used to apply theming or other customizations to the web content.
   *
   * @see webview-utils.ts -> createThemedWebViewScript for an example.
   * @type {string | undefined}
   */
  injectedJavascript?: string
}

/**
 * A WebView component that loads a given URL with optional injected JavaScript.
 *
 * @param {WebViewContentProps} props - The component props.
 * @returns {*} {JSX.Element} The rendered WebView component.
 */
const WebViewContent: React.FC<WebViewContentProps> = ({ url, injectedJavascript, onLoaded }) => {
  const { ColorPalette } = useTheme()
  const client = useBCSCApiClient()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const styles = StyleSheet.create({
    loadingContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: ColorPalette.brand.primaryBackground,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
    },
  })

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
    <WebView
      source={{
        uri: url,
        headers: { Authorization: `Bearer ${client.tokens?.access_token}` },
      }}
      startInLoadingState={true}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      allowsBackForwardNavigationGestures={true}
      bounces={false}
      renderLoading={() => (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size={'large'} />
        </View>
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
      onLoad={onLoaded}
    />
  )
}

export { WebViewContent }
