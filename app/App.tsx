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
} from '@hyperledger/aries-bifold-core'
import { useNavigation } from '@react-navigation/native'
import React, { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StatusBar } from 'react-native'
import SplashScreen from 'react-native-splash-screen'
import Toast from 'react-native-toast-message'

import qcwallet from './src'
import { credentialOfferTourSteps } from './src/components/tours/CredentialOfferTourSteps'
import { credentialsTourSteps } from './src/components/tours/CredentialsTourSteps'
import { homeTourSteps } from './src/components/tours/HomeTourSteps'
import { proofRequestTourSteps } from './src/components/tours/ProofRequestTourSteps'
import { AttestationProvider } from './src/services/attestation'
import { initialState, reducer } from './src/store'

const { theme, localization, configuration } = qcwallet

initLanguages(localization)

const App = () => {
  useMemo(() => {
    initStoredLanguage().then()
  }, [])
  const { t } = useTranslation()
  const { navigate } = useNavigation()

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
    <StoreProvider initialState={initialState} reducer={reducer}>
      <AgentProvider>
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
                    overlayColor={'gray'}
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
  )
}

export default App
