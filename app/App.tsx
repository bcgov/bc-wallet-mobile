import Root from '@/Root'
import { ErrorModal, initLanguages, initStoredLanguage, toastConfig } from '@bifold/core'
import messaging from '@react-native-firebase/messaging'
import React, { useEffect, useMemo } from 'react'
import { isTablet } from 'react-native-device-info'
import Orientation from 'react-native-orientation-locker'
import SplashScreen from 'react-native-splash-screen'
import Toast from 'react-native-toast-message'

import { AppProviders } from '@/AppProviders'
import { localization } from '@/localization'

initLanguages(localization)

// Do nothing with push notifications received while the app is in the background
messaging().setBackgroundMessageHandler(async () => {})

// Do nothing with push notifications received while the app is in the foreground
messaging().onMessage(async () => {})

const App = () => {
  if (!isTablet()) {
    Orientation.lockToPortrait()
  }

  useMemo(() => {
    initStoredLanguage().then()
  }, [])

  useEffect(() => {
    // Hide the native splash / loading screen so
    // that our RN version can be displayed.
    SplashScreen.hide()
  }, [])

  return (
    <AppProviders>
      <ErrorModal enableReport />
      <Root />
      <Toast topOffset={15} config={toastConfig} />
    </AppProviders>
  )
}

export default App
