import { BCState } from '@/store'
import { BifoldError, DispatchAction, EventTypes, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, DeviceEventEmitter } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import VerifyIdentityStack from '../features/verify/VerifyIdentityStack'
import { useBCSCApiClientState } from '../hooks/useBCSCApiClient'
import useInitializeBCSC from '../hooks/useInitializeBCSC'
import BCSCMainStack from './MainStack'
import BCSCOnboardingStack from './OnboardingStack'
import { SystemCheckScope, useSystemChecks } from '../hooks/useSystemChecks'

const BCSCRootStack: React.FC = () => {
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const theme = useTheme()
  const [loadState] = useServices([TOKENS.LOAD_STATE])
  const initializeBCSC = useInitializeBCSC()
  const { isClientReady } = useBCSCApiClientState()
  useSystemChecks(SystemCheckScope.STARTUP)

  const LoadingView = () => (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.ColorPalette.brand.primaryBackground }}>
      <ActivityIndicator size={'large'} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />
    </SafeAreaView>
  )

  useEffect(() => {
    // Load state only if it hasn't been loaded yet
    if (store.stateLoaded) {
      return
    }

    try {
      loadState(dispatch)
    } catch (error) {
      const bifoldError = new BifoldError(t('Error.Title1044'), t('Error.Message1044'), (error as Error).message, 1001)
      DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, bifoldError)
    }
  }, [dispatch, loadState, t, store.stateLoaded])

  /**
   * ONBOARDING PATCH
   *
   * TODO (MD) REMOVE: TEMPORARY CODE FOR ONBOARDING DEVELOPMENT PURPOSES
   *
   * Why? There are some decision notes related to PIN creation and authentication in BCSC.
   *
   * This useEffect is a temp patch to allow developers to bypass the PIN creation
   * and authentication screens during onboarding. It automatically marks the user as authenticated.
   */
  useEffect(() => {
    const asyncEffect = async () => {
      if (store.authentication.didAuthenticate === false) {
        dispatch({ type: DispatchAction.DID_AUTHENTICATE, payload: [true] })
      }
    }

    asyncEffect()
  }, [dispatch, store.authentication.didAuthenticate])

  // Show loading screen if state or wallet secret not loaded yet
  if (!store.stateLoaded || initializeBCSC.loading || !isClientReady) {
    return <LoadingView />
  }

  // Show onboarding stack if onboarding not completed yet
  if (!store.bcsc.completedOnboarding) {
    return <BCSCOnboardingStack />
  }

  // Show startup stack if agent isn't initialized or user hasn't authenticated yet (biometrics/PIN)
  // if (!agent || !store.authentication.didAuthenticate) {
  //   return <StartupStack initializeAgent={initializeAgent} />
  // }

  // Show identity verification stack (setup steps) if user unverified
  if (!store.bcsc.verified || store.bcsc.selectedNickname === undefined) {
    return <VerifyIdentityStack />
  }

  // Otherwise, show the main stack (app)
  return (
    // <AgentProvider agent={agent}>
    // <OpenIDCredentialRecordProvider>
    <BCSCMainStack />
    // </OpenIDCredentialRecordProvider>
    // </AgentProvider>
  )
}

export default BCSCRootStack
