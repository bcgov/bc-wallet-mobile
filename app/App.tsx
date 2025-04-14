import AgentProvider from '@credo-ts/react-hooks'
import {
  AnimatedComponentsProvider,
  animatedComponents,
  TourProvider,
  AuthProvider,
  toastConfig,
  initStoredLanguage,
  RootStack,
  NetInfo,
  NetworkProvider,
  ErrorModal,
  StoreProvider,
  ThemeProvider,
  initLanguages,
  ContainerProvider,
  MainContainer,
  ActivityProvider,
  OpenIDCredentialRecordProvider,
} from '@bifold/core'
import messaging from '@react-native-firebase/messaging'
import { useNavigation } from '@react-navigation/native'
import React, { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StatusBar } from 'react-native'
import { isTablet } from 'react-native-device-info'
import Orientation from 'react-native-orientation-locker'
import SplashScreen from 'react-native-splash-screen'
import Toast from 'react-native-toast-message'
import { container } from 'tsyringe'

import { AppContainer } from './container-imp'
import bcwallet from './src'
import tours from './src/components/tours'
import { surveyMonkeyUrl, surveyMonkeyExitUrl } from './src/constants'
import WebDisplay from './src/screens/WebDisplay'
import { initialState, reducer } from './src/store'

const { theme, localization } = bcwallet

initLanguages(localization)

// Do nothing with push notifications received while the app is in the background
messaging().setBackgroundMessageHandler(async () => {})

// Do nothing with push notifications received while the app is in the foreground
messaging().onMessage(async () => {})

const App = () => {
  const { t } = useTranslation()
  const { navigate } = useNavigation()
  const bifoldContainer = new MainContainer(container.createChildContainer()).init()
  const [surveyVisible, setSurveyVisible] = useState(false)
  const bcwContainer = new AppContainer(bifoldContainer, t, navigate, setSurveyVisible).init()

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
    <AgentProvider agent={undefined}>
      <ContainerProvider value={bcwContainer}>
        <StoreProvider initialState={initialState} reducer={reducer}>
          <OpenIDCredentialRecordProvider>
            <ThemeProvider value={theme}>
              <AnimatedComponentsProvider value={animatedComponents}>
                <AuthProvider>
                  <NetworkProvider>
                    <ActivityProvider>
                      <StatusBar
                        barStyle="light-content"
                        hidden={false}
                        backgroundColor={theme.ColorPallet.brand.primary}
                        translucent={false}
                      />
                      <NetInfo />
                      <ErrorModal enableReport />
                      <WebDisplay
                        destinationUrl={surveyMonkeyUrl}
                        exitUrl={surveyMonkeyExitUrl}
                        visible={surveyVisible}
                        onClose={() => setSurveyVisible(false)}
                      />
                      <TourProvider tours={tours} overlayColor={'black'} overlayOpacity={0.7}>
                        <RootStack />
                      </TourProvider>
                      <Toast topOffset={15} config={toastConfig} />
                    </ActivityProvider>
                  </NetworkProvider>
                </AuthProvider>
              </AnimatedComponentsProvider>
            </ThemeProvider>
          </OpenIDCredentialRecordProvider>
        </StoreProvider>
      </ContainerProvider>
    </AgentProvider>
  )
}

export default App
