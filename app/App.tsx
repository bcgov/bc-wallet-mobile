import {
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
  types,
  contexts,
} from 'aries-bifold'
import _merge from 'lodash.merge'
import React, { useEffect, useState } from 'react'
import { StatusBar } from 'react-native'
import SplashScreen from 'react-native-splash-screen'
import Toast from 'react-native-toast-message'

import bcwallet from './src'
import { BcWalletReducer, BcWalletState } from './src/types'

const { theme, localization, configuration } = bcwallet

initLanguages(localization)
const reducer = contexts.store.mergeReducers(BcWalletReducer, contexts.store.defaultReducer)
const state = new BcWalletState()

const App = () => {
  const [agent, setAgent] = useState<Agent | undefined>(undefined)
  initStoredLanguage()

  useEffect(() => {
    // Hide the native splash / loading screen so that our
    // RN version can be displayed.
    SplashScreen.hide()
  }, [])
  return (
    <StoreProvider initialState={state} reducer={reducer}>
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
