import {
  BifoldError,
  DispatchAction,
  EventTypes,
  OpenIDCredentialRecordProvider,
  TOKENS,
  useAuth,
  useServices,
  useStore,
  useTheme,
} from '@bifold/core'
import AgentProvider from '@credo-ts/react-hooks'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, DeviceEventEmitter } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BCState } from '@/store'
import VerifyIdentityStack from '../features/verify/VerifyIdentityStack'
import useInitializeBCSC from '../hooks/useInitializeBCSC'
import BCSCMainStack from './MainStack'
import BCSCOnboardingStack from './OnboardingStack'
import { StartupStack } from './StartupStack'

const TEMP_DEVELOPMENT_PIN = '111111'

const TempLoadingView = () => {
  const { ColorPalette } = useTheme()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ColorPalette.brand.primaryBackground }}>
      <ActivityIndicator size={'large'} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />
    </SafeAreaView>
  )
}

const BCSCRootStack: React.FC = () => {
  const [store, dispatch] = useStore<BCState>()
  const { t } = useTranslation()
  const [useAgentSetup, loadState] = useServices([TOKENS.HOOK_USE_AGENT_SETUP, TOKENS.LOAD_STATE])
  const { agent, initializeAgent, shutdownAndClearAgentIfExists } = useAgentSetup()
  const initializeBCSC = useInitializeBCSC()
  const { setPIN: setWalletPIN, getWalletSecret } = useAuth()

  useEffect(() => {
    if (store.authentication.didAuthenticate) {
      return
    }

    // if user gets locked out, erase agent
    shutdownAndClearAgentIfExists()
  }, [store.authentication.didAuthenticate, shutdownAndClearAgentIfExists])

  useEffect(() => {
    // Load state only if it hasn't been loaded yet
    if (store.stateLoaded) {
      return
    }

    loadState(dispatch).catch((err: unknown) => {
      const error = new BifoldError(t('Error.Title1044'), t('Error.Message1044'), (err as Error).message, 1001)

      DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error)
    })
  }, [dispatch, loadState, t, store.stateLoaded])

  /**
   * ONBOARDING PATCH
   *
   * TODO (MD) REMOVE: TEMPORARY CODE FOR ONBOARDING DEVELOPMENT PURPOSES
   *
   * Why? There are some decision notes related to PIN creation and authentication in BCSC.
   *
   * This useEffect is a temp patch to allow developers to bypass the PIN creation
   * and authentication screens during onboarding. It automatically sets a default PIN,
   * and marks the user as authenticated.
   */
  useEffect(() => {
    const asyncEffect = async () => {
      if (!store.authentication.didAuthenticate) {
        dispatch({ type: DispatchAction.DID_AUTHENTICATE, payload: [true] })
      }

      if (!store.onboarding.didCreatePIN) {
        await setWalletPIN(TEMP_DEVELOPMENT_PIN)
        dispatch({ type: DispatchAction.DID_CREATE_PIN, payload: [true] })
      }

      await getWalletSecret()
    }

    asyncEffect()
  }, [dispatch, getWalletSecret, setWalletPIN, store.authentication.didAuthenticate, store.onboarding.didCreatePIN])

  // Show onboarding stack if uncompleted
  if (!store.bcsc.completedOnboarding) {
    return <BCSCOnboardingStack />
  }

  // Show identity verification stack if user unverified
  if (!store.bcsc.verified) {
    return <VerifyIdentityStack />
  }

  // Show startup stack if agent isn't initialized or user hasn't authenticated yet
  if (!agent || !store.authentication.didAuthenticate) {
    return <StartupStack initializeAgent={initializeAgent} />
  }

  // Show loading indicator if BCSC initializing (probably unnecessary, but just in case)
  if (initializeBCSC.loading) {
    return <TempLoadingView />
  }

  // Otherwise, show the main stack (app)
  return (
    <AgentProvider agent={agent}>
      <OpenIDCredentialRecordProvider>
        <BCSCMainStack />
      </OpenIDCredentialRecordProvider>
    </AgentProvider>
  )
}

export default BCSCRootStack
