import { useBCSCApiClient } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { TOKENS, useServices, useTheme } from '@bifold/core'
import React, { useCallback } from 'react'
import { ActivityIndicator, Platform, StyleSheet, useWindowDimensions, View } from 'react-native'
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
   * Loading test url: 'https://httpbin.org/delay/2'
   *
   * @type {() => void}
   */
  onLoaded?: () => void
  /**
   * Optional JavaScript code to inject into the WebView before content loads.
   * Why? This is used to apply theming or other customizations to the web content.
   *
   * @see webview-utils.ts -> createTermsOfUseWebViewJavascriptInjection for an example.
   * @type {string | undefined}
   */
  injectedJavascript?: string
}

/**
 * A WebView component that loads a given URL with optional injected JavaScript.
 * Automatically applies accessibility font scaling based on device settings.
 *
 * @param {WebViewContentProps} props - The component props.
 * @returns {*} {React.ReactElement} The rendered WebView component.
 */
const WebViewContent: React.FC<WebViewContentProps> = ({ url, injectedJavascript, onLoaded }) => {
  const { ColorPalette } = useTheme()
  const client = useBCSCApiClient()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { fontScale } = useWindowDimensions()

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
        // helpful testing url 'https://httpbin.org/delay/2'
        uri: url,
        headers: { Authorization: `Bearer ${client.tokens?.access_token}` },
      }}
      startInLoadingState={true}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      allowsBackForwardNavigationGestures={true}
      bounces={false}
      style={{ backgroundColor: ColorPalette.brand.primaryBackground }}
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
      // Accessibility: Apply font scaling for dynamic text sizing
      textZoom={Platform.OS === 'android' ? Math.round(fontScale * 100) : undefined}
      injectedJavaScriptBeforeContentLoaded={injectedJavascript}
      onMessage={() => {}} // Required for injectedJavaScript to work
      onLoad={onLoaded}
    />
  )
}

export { WebViewContent }
