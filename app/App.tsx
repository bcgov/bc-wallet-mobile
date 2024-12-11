import {
  AgentProvider,
  AnimatedComponentsProvider,
  animatedComponents,
  TourProvider,
  AuthProvider,
  initStoredLanguage,
  NetInfo,
  NetworkProvider,
  ErrorModal,
  StoreProvider,
  ThemeProvider,
  initLanguages,
  ContainerProvider,
  ActivityProvider,
  Container,
} from '@hyperledger/aries-bifold-core'
import { OpenIDCredentialRecordProvider } from '@hyperledger/aries-bifold-core/App/modules/openid/context/OpenIDCredentialRecordProvider'
import React, { useEffect, useMemo, useState } from 'react'
import { StatusBar } from 'react-native'
import { isTablet } from 'react-native-device-info'
import Orientation from 'react-native-orientation-locker'
import SplashScreen from 'react-native-splash-screen'
import Toast from 'react-native-toast-message'

import qcwallet from './src'
import ToastConfig from './src/components/toast/ToastConfig'
import { credentialOfferTourSteps } from './src/components/tours/CredentialOfferTourSteps'
import { credentialsTourSteps } from './src/components/tours/CredentialsTourSteps'
import { homeTourSteps } from './src/components/tours/HomeTourSteps'
import { proofRequestTourSteps } from './src/components/tours/ProofRequestTourSteps'
import { toastBottomOffset, toastTopOffset } from './src/constants'
import RootStack from './src/navigators/RootStack'
import { BCState, getInitialState, reducer } from './src/store'

const { theme, localization } = qcwallet

const App = (system: Container): React.FC => {
  initLanguages(localization)

  const AppComponent = () => {
    useMemo(() => {
      initStoredLanguage().then()
    }, [])

    const [initialState, setInitialState] = useState<BCState>()

    useEffect(() => {
      const getAsyncInitialState = async () => {
        const initial = await getInitialState()
        setInitialState(initial)
      }
      getAsyncInitialState()
    }, [])

    if (!isTablet()) {
      Orientation.lockToPortrait()
    }

    useEffect(() => {
      // Hide the native splash / loading screen so that our
      // RN version can be displayed.

      SplashScreen.hide()
    }, [])

    return (
      <ContainerProvider value={system}>
        <StoreProvider initialState={initialState} reducer={reducer}>
          <AgentProvider agent={undefined}>
            <OpenIDCredentialRecordProvider>
              <ThemeProvider value={theme}>
                <AnimatedComponentsProvider value={animatedComponents}>
                  <AuthProvider>
                    <NetworkProvider>
                      <ActivityProvider>
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
                        <Toast topOffset={toastTopOffset} bottomOffset={toastBottomOffset} config={ToastConfig} />
                      </ActivityProvider>
                    </NetworkProvider>
                  </AuthProvider>
                </AnimatedComponentsProvider>
              </ThemeProvider>
            </OpenIDCredentialRecordProvider>
          </AgentProvider>
        </StoreProvider>
      </ContainerProvider>
    )
  }

  return AppComponent
}

export default App
