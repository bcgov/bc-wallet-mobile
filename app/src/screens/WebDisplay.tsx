import { SafeAreaModal } from '@hyperledger/aries-bifold-core'
import React from 'react'
import { StyleSheet } from 'react-native'
import { WebView, WebViewNavigation } from 'react-native-webview'

interface WebDisplayProps {
  destinationUrl: string
  visible: boolean
  onClose: () => void
  exitUrl: string
}

const WebDisplay = ({ destinationUrl, exitUrl, visible, onClose }: WebDisplayProps) => {
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 32,
    },
  })

  return (
    <SafeAreaModal animationType="slide" transparent={false} visible={visible}>
      <WebView
        style={styles.container}
        source={{ uri: destinationUrl }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onNavigationStateChange={(nav: WebViewNavigation) => {
          if (exitUrl && nav.url.includes(exitUrl)) {
            onClose()
          }
        }}
      />
    </SafeAreaModal>
  )
}

export default WebDisplay
