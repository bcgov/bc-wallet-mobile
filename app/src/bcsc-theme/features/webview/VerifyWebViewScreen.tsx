import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { RouteProp } from '@react-navigation/native'
import React from 'react'
import { WebViewContent } from './WebViewContent'

interface VerifyWebViewScreenProps {
  route: RouteProp<BCSCVerifyStackParams, BCSCScreens.VerifyWebView>
}

const VerifyWebViewScreen: React.FC<VerifyWebViewScreenProps> = ({ route }) => {
  const { url, injectedJavascript } = route.params

  return <WebViewContent url={url} injectedJavascript={injectedJavascript} />
}

export { VerifyWebViewScreen }
