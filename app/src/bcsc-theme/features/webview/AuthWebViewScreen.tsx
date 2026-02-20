import { BCSCAuthStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { RouteProp } from '@react-navigation/native'
import React from 'react'
import { WebViewContent } from './WebViewContent'

interface AuthWebViewScreenProps {
  route: RouteProp<BCSCAuthStackParams, BCSCScreens.AuthWebView>
}

const AuthWebViewScreen: React.FC<AuthWebViewScreenProps> = ({ route }) => {
  const { url } = route.params

  return <WebViewContent url={url} />
}

export { AuthWebViewScreen }
