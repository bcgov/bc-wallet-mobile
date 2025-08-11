import {
  animatedComponents,
  AnimatedComponentsProvider,
  AuthProvider,
  ContainerProvider,
  ErrorModal,
  initLanguages,
  initStoredLanguage,
  MainContainer,
  NavContainer,
  NetworkProvider,
  StoreProvider,
  ThemeProvider,
  toastConfig,
  TourProvider,
  ErrorBoundaryWrapper,
  bifoldLoggerInstance,
} from '@bifold/core'
import messaging from '@react-native-firebase/messaging'
import { useNavigationContainerRef } from '@react-navigation/native'
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isTablet } from 'react-native-device-info'
import Orientation from 'react-native-orientation-locker'
import SplashScreen from 'react-native-splash-screen'
import Toast from 'react-native-toast-message'
import { container } from 'tsyringe'

import Root from '@/Root'
import { BCThemeNames, surveyMonkeyExitUrl, surveyMonkeyUrl } from '@/constants'
import { localization } from '@/localization'
import { initialState, reducer } from '@/store'
import { themes } from '@/theme'
import tours from '@bcwallet-theme/features/tours'
import WebDisplay from '@screens/WebDisplay'
import { AppContainer } from './container-imp'

initLanguages(localization)

// Do nothing with push notifications received while the app is in the background
messaging().setBackgroundMessageHandler(async () => {})

// Do nothing with push notifications received while the app is in the foreground
messaging().onMessage(async () => {})

const App = () => {
  const { t } = useTranslation()
  const navigationRef = useNavigationContainerRef()
  const bifoldContainer = new MainContainer(container.createChildContainer()).init()
  const [surveyVisible, setSurveyVisible] = useState(false)
  const bcwContainer = new AppContainer(bifoldContainer, t, navigationRef.navigate, setSurveyVisible).init()

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
    <ErrorBoundaryWrapper logger={bifoldLoggerInstance}>
      <ContainerProvider value={bcwContainer}>
        <StoreProvider initialState={initialState} reducer={reducer}>
          <ThemeProvider themes={themes} defaultThemeName={BCThemeNames.BCWallet}>
            <NavContainer navigationRef={navigationRef}>
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
                      <Root />
                    </TourProvider>
                    <Toast topOffset={15} config={toastConfig} />
                  </NetworkProvider>
                </AuthProvider>
              </AnimatedComponentsProvider>
            </NavContainer>
          </ThemeProvider>
        </StoreProvider>
      </ContainerProvider>
    </ErrorBoundaryWrapper>
  )
}

export default App
