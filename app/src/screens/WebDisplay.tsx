import React from 'react'
import { StyleSheet, Modal } from 'react-native'
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
    <Modal animationType="slide" transparent={false} visible={visible}>
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
    </Modal>
  )
}

export default WebDisplay
