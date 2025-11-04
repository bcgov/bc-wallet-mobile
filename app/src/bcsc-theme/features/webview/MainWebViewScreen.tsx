import React from 'react'
import { StackNavigationProp } from '@react-navigation/stack'
import { RouteProp } from '@react-navigation/native'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { WebViewContent } from './WebViewContent'

interface MainWebViewScreenProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.MainWebView>
  route: RouteProp<BCSCMainStackParams, BCSCScreens.MainWebView>
}

const MainWebViewScreen: React.FC<MainWebViewScreenProps> = ({ route }) => {
  const { url } = route.params

  return <WebViewContent url={url} />
}

export { MainWebViewScreen }