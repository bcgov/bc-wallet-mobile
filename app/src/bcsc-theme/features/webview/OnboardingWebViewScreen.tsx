import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { RouteProp } from '@react-navigation/native'
import React from 'react'
import { WebViewContent } from './WebViewContent'

interface OnboardingWebViewScreenProps {
  route: RouteProp<BCSCOnboardingStackParams, BCSCScreens.OnboardingWebView>
}

const OnboardingWebViewScreen: React.FC<OnboardingWebViewScreenProps> = ({ route }) => {
  const { url } = route.params

  return <WebViewContent url={url} />
}

export { OnboardingWebViewScreen }
