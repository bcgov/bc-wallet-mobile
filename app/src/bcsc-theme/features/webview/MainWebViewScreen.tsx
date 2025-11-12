import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { RouteProp } from '@react-navigation/native'
import React from 'react'
import { WebViewContent } from './WebViewContent'

interface MainWebViewScreenProps {
  route: RouteProp<BCSCMainStackParams, BCSCScreens.MainWebView>
}

const MainWebViewScreen: React.FC<MainWebViewScreenProps> = ({ route }) => {
  const { url, injectedJavascript } = route.params

  return <WebViewContent url={url} injectedJavascript={injectedJavascript} />
}

export { MainWebViewScreen }
