import {
  BifoldError,
  EventTypes,
  OpenIDCredentialRecordProvider,
  TOKENS,
  useServices,
  useStore,
  useTheme,
} from '@bifold/core'
import AgentProvider from '@credo-ts/react-hooks'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, DeviceEventEmitter, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BCState } from '@/store'
import VerifyIdentityStack from '../features/verify/VerifyIdentityStack'
import useInitializeBCSC from '../hooks/useInitializeBCSC'
import BCSCMainStack from './MainStack'
import BCSCOnboardingStack from './OnboardingStack'
import Splash from '@/screens/Splash'
import assert from 'assert'
import { StartupStack } from './StartupStack'

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
  const theme = useTheme()
  const [useAgentSetup, loadState] = useServices([TOKENS.HOOK_USE_AGENT_SETUP, TOKENS.LOAD_STATE])
  const { agent, initializeAgent, shutdownAndClearAgentIfExists } = useAgentSetup()
  // const [onboardingComplete, setOnboardingComplete] = useState(false)
  const initializeBCSC = useInitializeBCSC()

  const shouldRenderMainStack = store.bcsc.completedOnboarding && store.authentication.didAuthenticate

  useEffect(() => {
    // if user gets locked out, erase agent
    if (!store.authentication.didAuthenticate) {
      shutdownAndClearAgentIfExists()
    }
  }, [store.authentication.didAuthenticate, shutdownAndClearAgentIfExists])

  // useEffect(() => {
  //   const sub = DeviceEventEmitter.addListener(EventTypes.DID_COMPLETE_ONBOARDING, () => {
  //     setOnboardingComplete(true)
  //   })
  //
  //   return sub.remove
  // }, [])

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

  // Enter PIN or biometrics -> render splash + initialize agent -> initialize BCSC -> render main stack

  // If onboarding not complete, render onboarding stack
  // Set of screens shown only once after app install
  if (!store.bcsc.completedOnboarding) {
    return <BCSCOnboardingStack />
  }

  // If user not authenticated, show Startup Stack
  // Startup stack handles authentication and agent initialization (Splash screen, PIN entry, biometrics)
  if (!store.authentication.didAuthenticate) {
    return <StartupStack />
  }

  // If BCSC is initializing, show loading screen... doubtful we will ever see this
  if (initializeBCSC.loading) {
    return <TempLoadingView />
  }

  assert(agent, 'Agent should be initialized')
  assert(store.authentication.didAuthenticate, 'User should be authenticated')

  if (!store.bcsc.verified) {
    return (
      <AgentProvider agent={agent}>
        <OpenIDCredentialRecordProvider>
          <VerifyIdentityStack />
        </OpenIDCredentialRecordProvider>
      </AgentProvider>
    )
  }

  return (
    <AgentProvider agent={agent}>
      <OpenIDCredentialRecordProvider>
        <BCSCMainStack />
      </OpenIDCredentialRecordProvider>
    </AgentProvider>
  )
}

export default BCSCRootStack
