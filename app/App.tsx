import {
  AgentProvider,
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
  TOKENS,
} from '@hyperledger/aries-bifold-core'
import { useNavigation } from '@react-navigation/native'
import React, { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, StatusBar } from 'react-native'
import { isTablet } from 'react-native-device-info'
import Orientation from 'react-native-orientation-locker'
import SplashScreen from 'react-native-splash-screen'
import Toast from 'react-native-toast-message'
import { container } from 'tsyringe'

import { AppContainer, AppState } from './container-imp'
import bcwallet from './src'
import { credentialOfferTourSteps } from './src/components/tours/CredentialOfferTourSteps'
import { credentialsTourSteps } from './src/components/tours/CredentialsTourSteps'
import { homeTourSteps } from './src/components/tours/HomeTourSteps'
import { proofRequestTourSteps } from './src/components/tours/ProofRequestTourSteps'
import { surveyMonkeyUrl, surveyMonkeyExitUrl } from './src/constants'
import WebDisplay from './src/screens/WebDisplay'
import { initialState, reducer } from './src/store'

const { theme, localization } = bcwallet

initLanguages(localization)

const App = () => {
  useMemo(() => {
    initStoredLanguage().then()
  }, [])
  const { t } = useTranslation()
  const { navigate } = useNavigation()
  const [appState, setAppState] = useState<AppState>({ showSurvey: false })
  const bifoldContainer = new MainContainer(container.createChildContainer()).init()
  const bcwContainer = new AppContainer(bifoldContainer, t, navigate, [appState, setAppState]).init()

  if (!isTablet()) {
    Orientation.lockToPortrait()
  }

  useEffect(() => {
    // this block fixes an issue when deep-link doesn't work
    // when the app is fully terminated on Android.
    // TODO: review and look for a fix
    async function getInitialURL() {
      const url = await Linking.getInitialURL()
      const logger = bcwContainer.resolve(TOKENS.UTIL_LOGGER)
      if (url) {
        logger.info(`App launched with URL: ${url}`)
      } else {
        logger.info('App launched without URL')
      }
    }
    getInitialURL()
    // Hide the native splash / loading screen so that our
    // RN version can be displayed.
    SplashScreen.hide()
  }, [])

  return (
    <ContainerProvider value={bcwContainer}>
      <StoreProvider initialState={initialState} reducer={reducer}>
        <AgentProvider agent={undefined}>
          <ThemeProvider value={theme}>
            <AnimatedComponentsProvider value={animatedComponents}>
              <AuthProvider>
                <NetworkProvider>
                  <StatusBar
                    barStyle="light-content"
                    hidden={false}
                    backgroundColor={theme.ColorPallet.brand.primary}
                    translucent={false}
                  />
                  <NetInfo />
                  <ErrorModal />
                  <WebDisplay
                    destinationUrl={surveyMonkeyUrl}
                    exitUrl={surveyMonkeyExitUrl}
                    visible={appState.showSurvey}
                    onClose={() => setAppState({ showSurvey: false })}
                  />
                  <TourProvider
                    homeTourSteps={homeTourSteps}
                    credentialsTourSteps={credentialsTourSteps}
                    credentialOfferTourSteps={credentialOfferTourSteps}
                    proofRequestTourSteps={proofRequestTourSteps}
                    overlayColor={'black'}
                    overlayOpacity={0.7}
                  >
                    <RootStack />
                  </TourProvider>
                  <Toast topOffset={15} config={toastConfig} />
                </NetworkProvider>
              </AuthProvider>
            </AnimatedComponentsProvider>
          </ThemeProvider>
        </AgentProvider>
      </StoreProvider>
    </ContainerProvider>
  )
}

export default App
