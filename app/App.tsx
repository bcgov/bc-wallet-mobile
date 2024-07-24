import {
  Stacks,
  Screens,
  AgentProvider,
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
  ConfigurationProvider,
  initLanguages,
  testIdWithKey,
  ContainerProvider,
  MainContainer,
} from '@hyperledger/aries-bifold-core'
import { useNavigation } from '@react-navigation/native'
import React, { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StatusBar } from 'react-native'
import { isTablet } from 'react-native-device-info'
import Orientation from 'react-native-orientation-locker'
import SplashScreen from 'react-native-splash-screen'
import Toast from 'react-native-toast-message'
import { container } from 'tsyringe'

import { AppContainer } from './container-imp'
import qcwallet from './src'
import { credentialOfferTourSteps } from './src/components/tours/CredentialOfferTourSteps'
import { credentialsTourSteps } from './src/components/tours/CredentialsTourSteps'
import { homeTourSteps } from './src/components/tours/HomeTourSteps'
import { proofRequestTourSteps } from './src/components/tours/ProofRequestTourSteps'
import { AttestationProvider } from './src/hooks/useAttestation'
import { initialState, reducer } from './src/store'

const { theme, localization, configuration } = qcwallet

initLanguages(localization)

const bifoldContainer = new MainContainer(container.createChildContainer()).init()
const qcwContainer = new AppContainer(bifoldContainer).init()

const App = () => {
  useMemo(() => {
    initStoredLanguage().then()
  }, [])
  const { t } = useTranslation()
  const { navigate } = useNavigation()

  if (!isTablet()) {
    Orientation.lockToPortrait()
  }

  const settings = [
    {
      header: {
        title: t('Settings.MoreInformation'),
        icon: { name: 'info' },
      },
      data: [
        {
          title: t('Settings.TermsOfUse'),
          accessibilityLabel: t('Settings.TermsOfUse'),
          testID: testIdWithKey('TermsOfUse'),
          onPress: () => navigate(Stacks.SettingStack as never, { screen: Screens.Terms } as never),
        },
        {
          title: t('Settings.IntroductionToTheApp'),
          accessibilityLabel: t('Settings.IntroductionToTheApp'),
          testID: testIdWithKey('IntroductionToTheApp'),
          onPress: () => navigate(Stacks.SettingStack as never, { screen: Screens.Onboarding } as never),
        },
      ],
    },
  ]

  configuration.settings = settings

  useEffect(() => {
    // Hide the native splash / loading screen so that our
    // RN version can be displayed.
    SplashScreen.hide()
  }, [])

  return (
    <ContainerProvider value={qcwContainer}>
      <StoreProvider initialState={initialState} reducer={reducer}>
        <AgentProvider agent={undefined}>
          <ThemeProvider value={theme}>
            <ConfigurationProvider value={configuration}>
              <AuthProvider>
                <NetworkProvider>
                  <AttestationProvider>
                    <StatusBar
                      barStyle="light-content"
                      hidden={false}
                      backgroundColor={theme.ColorPallet.brand.primary}
                      translucent={false}
                    />
                    <NetInfo />
                    <ErrorModal />
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
                  </AttestationProvider>
                </NetworkProvider>
              </AuthProvider>
            </ConfigurationProvider>
          </ThemeProvider>
        </AgentProvider>
      </StoreProvider>
    </ContainerProvider>
  )
}

export default App
