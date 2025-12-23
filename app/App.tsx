import Root from '@/Root'
import { DeepLinkService, DeepLinkViewModel, DeepLinkViewModelProvider } from '@/bcsc-theme/features/deep-linking'
import { FcmService, FcmViewModel, FcmViewModelProvider } from '@/bcsc-theme/features/fcm'
import { BCThemeNames, surveyMonkeyExitUrl, surveyMonkeyUrl } from '@/constants'
import { AlertProvider } from '@/contexts/AlertContext'
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
import WebDisplay from '@screens/WebDisplay'
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Config from 'react-native-config'
import { isTablet } from 'react-native-device-info'
import Orientation from 'react-native-orientation-locker'
import SplashScreen from 'react-native-splash-screen'
import Toast from 'react-native-toast-message'
import { container } from 'tsyringe'

import { AppContainer } from './container-imp'

initLanguages(localization)

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

  const fcmViewModel = useMemo(() => {
    const service = new FcmService()
    return new FcmViewModel(service, logger, deepLinkViewModel)
  }, [logger, deepLinkViewModel])

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

  useEffect(() => {
    fcmViewModel.initialize()
  }, [fcmViewModel])

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
                <FcmViewModelProvider viewModel={fcmViewModel}>
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
                          <AlertProvider>
                            <Root />
                          </AlertProvider>
                        </TourProvider>
                        <Toast topOffset={15} config={toastConfig} />
                      </NetworkProvider>
                    </AuthProvider>
                  </AnimatedComponentsProvider>
                </FcmViewModelProvider>
              </DeepLinkViewModelProvider>
            </NavigationContainerProvider>
          </ThemeProvider>
        </StoreProvider>
      </ContainerProvider>
    </ErrorBoundaryWrapper>
  )
}

export default App
