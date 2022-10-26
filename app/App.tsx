import { useNavigation } from '@react-navigation/core'
import {
  Stacks,
  Screens,
  Agent,
  AgentProvider,
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
} from 'aries-bifold'
import React, { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StatusBar } from 'react-native'
import SplashScreen from 'react-native-splash-screen'
import Toast from 'react-native-toast-message'

import bcwallet from './src'

const { theme, localization, configuration } = bcwallet

initLanguages(localization)

const App = () => {
  useMemo(() => {
    initStoredLanguage().then()
  }, [])

  const [agent, setAgent] = useState<Agent | undefined>(undefined)
  const { t } = useTranslation()
  const { navigate } = useNavigation()

  const settings = [
    // TODO: Resolve pages for these settings
    // {
    //   header: {
    //     title: t('Settings.Help'),
    //     icon: 'help',
    //   },
    //   data: [
    //     {
    //       title: t('Settings.HelpUsingBCWallet'),
    //     },
    //     {
    //       title: t('Settings.ReportAProblem'),
    //     },
    //   ],
    // },
    {
      header: {
        title: t('Settings.MoreInformation'),
        icon: 'info',
      },
      data: [
        {
          title: t('Settings.TermsOfUse'),
          accessibilityLabel: t('Settings.TermsOfUse'),
          onPress: () => navigate(Stacks.SettingStack as never, { screen: Screens.Terms } as never),
        },
        // TODO: Resolve pages for these settings
        // {
        //   title: t('Settings.PrivacyStatement'),
        //   accessibilityLabel: t('Settings.PrivacyStatement'),
        // },
        // {
        //   title: t('Settings.VulnerabilityDisclosurePolicy'),
        //   accessibilityLabel: t('Settings.VulnerabilityDisclosurePolicy'),
        // },
        // {
        //   title: t('Settings.Accessibility'),
        //   accessibilityLabel: t('Settings.Accessibility'),
        // },
        {
          title: t('Settings.IntroductionToTheApp'),
          accessibilityLabel: t('Settings.IntroductionToTheApp'),
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
    <StoreProvider>
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
                <RootStack setAgent={setAgent} />
                <Toast topOffset={15} config={toastConfig} />
              </NetworkProvider>
            </AuthProvider>
          </ConfigurationProvider>
        </ThemeProvider>
      </AgentProvider>
    </StoreProvider>
  )
}

export default App
