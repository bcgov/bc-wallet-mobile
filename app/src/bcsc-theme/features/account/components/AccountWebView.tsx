import React from 'react'
import { StyleSheet, View } from 'react-native'
import { WebView, WebViewNavigation } from 'react-native-webview'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@bifold/core'
import { RouteProp } from '@react-navigation/native'
import { BCSCRootStackParams, BCSCScreens } from '../../../types/navigators'
import client from '@/bcsc-theme/api/client'

export interface AccountWebViewProps {
  route: RouteProp<BCSCRootStackParams, BCSCScreens.AccountWebView>
}

const AccountWebView: React.FC<AccountWebViewProps> = ({ route }) => {
  const { ColorPallet } = useTheme()
  const { url } = route.params

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    console.log('WebView Navigation:', {
      url: navState.url,
      title: navState.title,
      loading: navState.loading,
      canGoBack: navState.canGoBack,
      canGoForward: navState.canGoForward
    })
  }

  const handleLoadStart = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent
    console.log('WebView Load Start:', nativeEvent.url)
  }

  const handleLoadEnd = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent
    console.log('WebView Load End:', nativeEvent.url)
  }

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent
    console.error('WebView Error:', nativeEvent)
  }

  const handleHttpError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent
    console.error('WebView HTTP Error:', {
      url: nativeEvent.url,
      statusCode: nativeEvent.statusCode,
      description: nativeEvent.description
    })
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPallet.brand.primaryBackground,
    },
    webview: {
      flex: 1,
    },
  })

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.container}>
        <WebView
          source={{ uri: url, headers: { 'Authorization': `Bearer ${client.tokens?.access_token}` } }}
          style={styles.webview}
          startInLoadingState={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsBackForwardNavigationGestures={true}
          onNavigationStateChange={handleNavigationStateChange}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
          onHttpError={handleHttpError}
          originWhitelist={['*']}
          mixedContentMode="compatibility"
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={true}
          userAgent="Single App"
        />
      </View>
    </SafeAreaView>
  )
}

export default AccountWebView
