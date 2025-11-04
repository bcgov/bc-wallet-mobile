import React from 'react'
import { StackNavigationProp } from '@react-navigation/stack'
import { RouteProp } from '@react-navigation/native'
import { BCSCVerifyStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { WebViewContent } from './WebViewContent'

interface VerifyWebViewScreenProps {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.VerifyWebView>
  route: RouteProp<BCSCVerifyStackParams, BCSCScreens.VerifyWebView>
}

const VerifyWebViewScreen: React.FC<VerifyWebViewScreenProps> = ({ route }) => {
  const { url } = route.params

  return <WebViewContent url={url} />
}

export { VerifyWebViewScreen }