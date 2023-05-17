import { useNavigation } from '@react-navigation/core'
import {
  Stacks,
  Screens,
  Agent,
  AgentProvider,
  TourProvider,
  AuthProvider,
  toastConfig,
  initStoredLanguage,
  RootStack,
  NetInfo,
  NetworkProvider,
  ErrorModal,
  ThemeProvider,
  ConfigurationProvider,
  initLanguages,
  testIdWithKey,
  useStore,
} from 'aries-bifold'
import React, { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, StatusBar } from 'react-native'
import SplashScreen from 'react-native-splash-screen'
import Toast from 'react-native-toast-message'

import bcwallet from './src'
import { homeTourSteps } from './src/components/tours/HomeTourSteps'
import { surveyMonkeyUrl, surveyMonkeyExitUrl } from './src/constants'
import WebDisplay from './src/screens/WebDisplay'
import { BCState } from './src/store'

const { theme, localization, configuration } = bcwallet

initLanguages(localization)

const App = () => {
  useMemo(() => {
    initStoredLanguage().then()
  }, [])

  const [store] = useStore<BCState>()
  const [agent] = useState<Agent | undefined>(undefined)
  const [surveyVisible, setSurveyVisible] = useState(false)
  const { t } = useTranslation()
  const { navigate } = useNavigation()
  const toggleSurveyVisibility = () => setSurveyVisible(!surveyVisible)

  const helpLink = 'https://www2.gov.bc.ca/gov/content/governments/government-id/bc-wallet/help'

  const settings = [
    {
      header: {
        title: t('Settings.Help'),
        icon: 'help',
      },
      data: [
        {
          title: t('Settings.HelpUsingBCWallet'),
          accessibilityLabel: t('Settings.HelpUsingBCWallet'),
          testID: testIdWithKey('HelpUsingBCWallet'),
          onPress: () => Linking.openURL(helpLink),
        },
      ],
    },
    {
      header: {
        title: t('Settings.MoreInformation'),
        icon: 'info',
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

  if (store.preferences.developerModeEnabled) {
    const section = settings.find((item) => item.header.title === t('Settings.Help'))
    if (section) {
      section.data = [
        ...section.data,
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
      ]
    }
  }

  configuration.settings = settings

  useEffect(() => {
    // Hide the native splash / loading screen so that our
    // RN version can be displayed.
    SplashScreen.hide()
  }, [])

  return (
    <AgentProvider agent={agent}>
      <ThemeProvider value={theme}>
        <ConfigurationProvider value={configuration}>
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
                visible={surveyVisible}
                onClose={toggleSurveyVisibility}
              />
              <TourProvider steps={homeTourSteps} overlayColor={'black'} overlayOpacity={0.6}>
                <RootStack />
              </TourProvider>
              <Toast topOffset={15} config={toastConfig} />
            </NetworkProvider>
          </AuthProvider>
        </ConfigurationProvider>
      </ThemeProvider>
    </AgentProvider>
  )
}

export default App
