/* eslint-disable import/no-extraneous-dependencies */
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
import React, { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, StatusBar } from 'react-native'
import codePush from 'react-native-code-push'
import { isTablet } from 'react-native-device-info'
import Orientation from 'react-native-orientation-locker'
import SplashScreen from 'react-native-splash-screen'
import Toast from 'react-native-toast-message'
import { container } from 'tsyringe'

import { AppContainer } from './container-imp'
import bcwallet from './src'
import { credentialOfferTourSteps } from './src/components/tours/CredentialOfferTourSteps'
import { credentialsTourSteps } from './src/components/tours/CredentialsTourSteps'
import { homeTourSteps } from './src/components/tours/HomeTourSteps'
import { proofRequestTourSteps } from './src/components/tours/ProofRequestTourSteps'
import { surveyMonkeyUrl, surveyMonkeyExitUrl } from './src/constants'
import WebDisplay from './src/screens/WebDisplay'
import { AttestationProvider } from './src/services/attestation'
import { initialState, reducer } from './src/store'

const { theme, localization, configuration } = bcwallet

initLanguages(localization)

const bifoldContainer = new MainContainer(container.createChildContainer()).init()
const bcwContainer = new AppContainer(bifoldContainer).init()

const codePushOptions = {
  checkFrequency: codePush.CheckFrequency.ON_APP_RESUME,
  installMode: codePush.InstallMode.IMMEDIATE,
  updateDialog: {
    appendReleaseDescription: true,
    title: 'A new update is available!',
  },
}

const App = () => {
  useMemo(() => {
    initStoredLanguage().then()
  }, [])
  const [surveyVisible, setSurveyVisible] = useState(false)
  const { t } = useTranslation()
  const { navigate } = useNavigation()
  const toggleSurveyVisibility = () => setSurveyVisible(!surveyVisible)

  const helpLink = 'https://www2.gov.bc.ca/gov/content/governments/government-id/bc-wallet/help'

  if (!isTablet()) {
    Orientation.lockToPortrait()
  }

  const settings = [
    {
      header: {
        title: t('Settings.Help'),
        icon: { name: 'help' },
      },
      data: [
        {
          title: t('Settings.HelpUsingBCWallet'),
          accessibilityLabel: t('Settings.HelpUsingBCWallet'),
          testID: testIdWithKey('HelpUsingBCWallet'),
          onPress: () => Linking.openURL(helpLink),
        },
        {
          title: t('Settings.GiveFeedback'),
          accessibilityLabel: t('Settings.GiveFeedback'),
          testID: testIdWithKey('GiveFeedback'),
          onPress: toggleSurveyVisibility,
        },
        {
          title: t('Settings.ReportAProblem'),
          accessibilityLabel: t('Settings.ReportAProblem'),
          testID: testIdWithKey('ReportAProblem'),
          onPress: toggleSurveyVisibility,
        },
      ],
    },
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
        {
          title: t('Settings.PlayWithBCWallet'),
          accessibilityLabel: t('Settings.PlayWithBCWallet'),
          testID: testIdWithKey('PlayWithBCWallet'),
          onPress: () => Linking.openURL('https://digital.gov.bc.ca/digital-trust/showcase/'),
        },
      ],
    },
  ]

  configuration.settings = settings

  useEffect(() => {
    // Hide the native splash / loading screen so that our
    // RN version can be displayed.
    codePush.sync({
      installMode: codePush.InstallMode.IMMEDIATE,
    })
    SplashScreen.hide()
  }, [])

  return (
    <ContainerProvider value={bcwContainer}>
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
                    <WebDisplay
                      destinationUrl={surveyMonkeyUrl}
                      exitUrl={surveyMonkeyExitUrl}
                      visible={surveyVisible}
                      onClose={toggleSurveyVisibility}
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

export default codePush(codePushOptions)(App)
