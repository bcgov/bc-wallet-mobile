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
import { isAppError } from '@/errors/appError'
import { ErrorBoundaryWrapper } from '@/errors/components/ErrorBoundary'
import { AppEventCode } from '@/events/appEventCode'
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
  ErrorModal,
  initLanguages,
  initStoredLanguage,
  MainContainer,
  NetworkProvider,
  statusBarStyleForColor,
  StoreProvider,
  ThemeProvider,
  toastConfig,
  TourProvider,
  useTheme,
} from '@bifold/core'
import WebDisplay from '@screens/WebDisplay'
import i18next from 'i18next'
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, StatusBar } from 'react-native'
import Config from 'react-native-config'
import { isTablet } from 'react-native-device-info'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import Orientation from 'react-native-orientation-locker'
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context'
import SplashScreen from 'react-native-splash-screen'
import Toast from 'react-native-toast-message'
import { container } from 'tsyringe'
import { AppContainer } from './container-imp'

// Only english in BCSC, all three languages in BC Wallet
initLanguages(Config.BUILD_TARGET === Mode.BCSC ? { en: localization.en } : localization)
initIssuer(appLogger)

// Module-level singletons - constructors are pure (no RN bridge calls)
// All platform interactions happen in initialize() methods
const pairingService = new PairingService(appLogger)
const verificationResponseService = new VerificationResponseService(appLogger)
const deepLinkViewModel = new DeepLinkViewModel(new DeepLinkService(), appLogger, pairingService)
const appMode = Config.BUILD_TARGET === Mode.BCSC ? Mode.BCSC : Mode.BCWallet
const fcmService = new FcmService(appLogger)
const fcmViewModel = new FcmViewModel(fcmService, appLogger, pairingService, verificationResponseService, appMode)

const ThemeAwareStatusBar = () => {
  const { ColorPalette } = useTheme()
  return <StatusBar barStyle={statusBarStyleForColor(ColorPalette.brand.primaryBackground)} />
}

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
    // Uses i18next.t() directly instead of the useTranslation hook's t() to avoid
    // adding a dependency to this init-only effect. The callback runs asynchronously
    // on FCM error, so i18next.t() resolves the current language at call time.
    fcmViewModel.setErrorHandler((error) => {
      if (isAppError(error, AppEventCode.ERR_111_UNABLE_TO_VERIFY_MISSING_JWK)) {
        Alert.alert(
          i18next.t('Alerts.ProblemWithApp.Title', { errorCode: '111' }),
          i18next.t('Alerts.ProblemWithApp.Description', { errorCode: '111' }),
          [{ text: i18next.t('Global.OK') }]
        )
      } else if (isAppError(error, AppEventCode.ERR_112_JWS_VERIFICATION_FAILED)) {
        Alert.alert(
          i18next.t('Alerts.ProblemWithApp.Title', { errorCode: '112' }),
          i18next.t('Alerts.ProblemWithApp.Description', { errorCode: '112' }),
          [{ text: i18next.t('Global.OK') }]
        )
      }
    })
    fcmViewModel.initialize()
  }, [])

  return (
    <ErrorBoundaryWrapper logger={logger}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <ContainerProvider value={bcwContainer}>
          <StoreProvider initialState={initialState} reducer={reducer}>
            <ThemeProvider
              themes={themes}
              defaultThemeName={Config.BUILD_TARGET === Mode.BCSC ? BCThemeNames.BCSC : BCThemeNames.BCWallet}
            >
              <NavigationContainerProvider>
                <PairingServiceProvider service={pairingService}>
                  <FcmServiceProvider service={fcmService} viewModel={fcmViewModel}>
                    <VerificationResponseServiceProvider service={verificationResponseService}>
                      <AnimatedComponentsProvider value={animatedComponents}>
                        <AuthProvider>
                          <NetworkProvider>
                            <ThemeAwareStatusBar />
                            <ErrorModal enableReport />
                            <WebDisplay
                              destinationUrl={surveyMonkeyUrl}
                              exitUrl={surveyMonkeyExitUrl}
                              visible={surveyVisible}
                              onClose={() => setSurveyVisible(false)}
                            />
                            <TourProvider tours={tours} overlayColor={'black'} overlayOpacity={0.7}>
                              <ErrorAlertProvider enableReport>
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
      </SafeAreaProvider>
    </ErrorBoundaryWrapper>
  )
}

export default App
