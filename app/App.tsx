import Root from '@/Root'
import { DeepLinkService, DeepLinkViewModel, DeepLinkViewModelProvider } from '@/bcsc-theme/features/deep-linking'
import { BCThemeNames, surveyMonkeyExitUrl, surveyMonkeyUrl } from '@/constants'
import { NavigationContainerProvider, navigationRef } from '@/contexts/NavigationContainerContext'
import { localization } from '@/localization'
import { initialState, Mode, reducer } from '@/store'
import { themes } from '@/theme'
import { appLogger } from '@/utils/logger'
import tours from '@bcwallet-theme/features/tours'
import {
  animatedComponents,
  AnimatedComponentsProvider,
  AuthProvider,
  ContainerProvider,
  ErrorBoundaryWrapper,
  ErrorModal,
  initLanguages,
  initStoredLanguage,
  MainContainer,
  NetworkProvider,
  StoreProvider,
  ThemeProvider,
  toastConfig,
  TourProvider,
} from '@bifold/core'
import messaging from '@react-native-firebase/messaging'
import WebDisplay from '@screens/WebDisplay'
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Config from 'react-native-config'
import { isTablet } from 'react-native-device-info'
import Orientation from 'react-native-orientation-locker'
import SplashScreen from 'react-native-splash-screen'
import Toast from 'react-native-toast-message'
import { container } from 'tsyringe'

import { showLocalNotification } from 'react-native-bcsc-core'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { AppContainer } from './container-imp'

initLanguages(localization)

// Do nothing with push notifications received while the
// app is in the background
messaging().setBackgroundMessageHandler(async () => {})

// Display notifications received while app is in foreground.
// Without this handler, foreground notifications are silently ignored.
messaging().onMessage(async (remoteMessage) => {
  if (remoteMessage.data) {
    appLogger.info(`FCM message payload: ${JSON.stringify(remoteMessage.data)}`)
  }

  const title = remoteMessage.notification?.title
  const message = remoteMessage.notification?.body
  if (title && message) {
    try {
      await showLocalNotification(title, message)
    } catch (error) {
      appLogger.error(`Failed to show local notification: ${error}`)
    }
  }
})

const App = () => {
  const { t } = useTranslation()
  const logger = appLogger
  const bifoldContainer = new MainContainer(container.createChildContainer()).init()
  const [surveyVisible, setSurveyVisible] = useState(false)
  const bcwContainer = new AppContainer(bifoldContainer, t, navigationRef.navigate, setSurveyVisible).init()
  const deepLinkViewModel = useMemo(() => {
    const service = new DeepLinkService()
    return new DeepLinkViewModel(service, logger)
  }, [logger])

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

  useEffect(() => {
    deepLinkViewModel.initialize()
  }, [deepLinkViewModel])

  return (
    <ErrorBoundaryWrapper logger={logger}>
      <ContainerProvider value={bcwContainer}>
        <StoreProvider initialState={initialState} reducer={reducer}>
          <ThemeProvider
            themes={themes}
            defaultThemeName={Config.BUILD_TARGET === Mode.BCSC ? BCThemeNames.BCSC : BCThemeNames.BCWallet}
          >
            <NavigationContainerProvider>
              <DeepLinkViewModelProvider viewModel={deepLinkViewModel}>
                <AnimatedComponentsProvider value={animatedComponents}>
                  <AuthProvider>
                    <NetworkProvider>
                      <ErrorModal enableReport />
                      <WebDisplay
                        destinationUrl={surveyMonkeyUrl}
                        exitUrl={surveyMonkeyExitUrl}
                        visible={surveyVisible}
                        onClose={() => setSurveyVisible(false)}
                      />
                      <TourProvider tours={tours} overlayColor={'black'} overlayOpacity={0.7}>
                        <KeyboardProvider statusBarTranslucent={true} navigationBarTranslucent={true}>
                          <Root />
                        </KeyboardProvider>
                      </TourProvider>
                      <Toast topOffset={15} config={toastConfig} />
                    </NetworkProvider>
                  </AuthProvider>
                </AnimatedComponentsProvider>
              </DeepLinkViewModelProvider>
            </NavigationContainerProvider>
          </ThemeProvider>
        </StoreProvider>
      </ContainerProvider>
    </ErrorBoundaryWrapper>
  )
}

export default App
