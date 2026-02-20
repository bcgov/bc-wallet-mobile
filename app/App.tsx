import Root from '@/Root'
import { DeepLinkService, DeepLinkViewModel } from '@/bcsc-theme/features/deep-linking'
import { FcmService, FcmServiceProvider, FcmViewModel } from '@/bcsc-theme/features/fcm'
import { PairingService, PairingServiceProvider } from '@/bcsc-theme/features/pairing'
import {
  VerificationResponseService,
  VerificationResponseServiceProvider,
} from '@/bcsc-theme/features/verification-response'
import { BCThemeNames, surveyMonkeyExitUrl, surveyMonkeyUrl } from '@/constants'
import { ErrorAlertProvider } from '@/contexts/ErrorAlertContext'
import { NavigationContainerProvider, navigationRef } from '@/contexts/NavigationContainerContext'
import { localization } from '@/localization'
import { initialState, Mode, reducer } from '@/store'
import { themes } from '@/theme'
import { initIssuer } from '@/utils/issuer'
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
import WebDisplay from '@screens/WebDisplay'
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Config from 'react-native-config'
import { isTablet } from 'react-native-device-info'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import Orientation from 'react-native-orientation-locker'
import SplashScreen from 'react-native-splash-screen'
import Toast from 'react-native-toast-message'
import { container } from 'tsyringe'
import { AppContainer } from './container-imp'

initLanguages(localization)
initIssuer(appLogger)

// Module-level singletons - constructors are pure (no RN bridge calls)
// All platform interactions happen in initialize() methods
const pairingService = new PairingService(appLogger)
const verificationResponseService = new VerificationResponseService(appLogger)
const deepLinkViewModel = new DeepLinkViewModel(new DeepLinkService(), appLogger, pairingService)
const appMode = Config.BUILD_TARGET === Mode.BCSC ? Mode.BCSC : Mode.BCWallet
const fcmService = new FcmService(appLogger)
const fcmViewModel = new FcmViewModel(fcmService, appLogger, pairingService, verificationResponseService, appMode)

const App = () => {
  const { t } = useTranslation()
  const logger = appLogger
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

  useEffect(() => {
    deepLinkViewModel.initialize()
    fcmViewModel.initialize()
  }, [])

  return (
    <ErrorBoundaryWrapper logger={logger}>
      <ContainerProvider value={bcwContainer}>
        <StoreProvider initialState={initialState} reducer={reducer}>
          <ThemeProvider
            themes={themes}
            defaultThemeName={Config.BUILD_TARGET === Mode.BCSC ? BCThemeNames.BCSC : BCThemeNames.BCWallet}
          >
            <NavigationContainerProvider>
              <PairingServiceProvider service={pairingService}>
                <FcmServiceProvider service={fcmService}>
                  <VerificationResponseServiceProvider service={verificationResponseService}>
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
                            <ErrorAlertProvider>
                              <KeyboardProvider statusBarTranslucent={true} navigationBarTranslucent={true}>
                                <Root />
                              </KeyboardProvider>
                            </ErrorAlertProvider>
                          </TourProvider>
                          <Toast topOffset={15} config={toastConfig} />
                        </NetworkProvider>
                      </AuthProvider>
                    </AnimatedComponentsProvider>
                  </VerificationResponseServiceProvider>
                </FcmServiceProvider>
              </PairingServiceProvider>
            </NavigationContainerProvider>
          </ThemeProvider>
        </StoreProvider>
      </ContainerProvider>
    </ErrorBoundaryWrapper>
  )
}

export default App
