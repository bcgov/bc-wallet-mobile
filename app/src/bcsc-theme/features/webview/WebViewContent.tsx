import React from 'react'
import { SafeAreaView, StyleSheet } from 'react-native'
import { WebView } from 'react-native-webview'
import { useTheme } from '@bifold/core'
import { createThemedWebViewScript } from '@/bcsc-theme/utils/webview-utils'

interface WebViewContentProps {
  url: string
}

const WebViewContent: React.FC<WebViewContentProps> = ({ url }) => {
  const { ColorPalette } = useTheme()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPalette.brand.secondaryBackground,
    },
  })

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        source={{ uri: url }}
        style={{ backgroundColor: ColorPalette.brand.secondaryBackground }}
        injectedJavaScriptBeforeContentLoaded={createThemedWebViewScript(ColorPalette)}
        onMessage={() => {}} // Required for injectedJavaScript to work
      />
    </SafeAreaView>
  )
}

export { WebViewContent }
