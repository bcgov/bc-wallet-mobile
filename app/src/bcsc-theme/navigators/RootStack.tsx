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
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, DeviceEventEmitter } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { BCState } from '@/store'
import VerifyIdentityStack from '../features/verify/VerifyIdentityStack'
import useInitializeBCSC from '../hooks/useInitializeBCSC'
import BCSCMainStack from './MainStack'

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
  const [useAgentSetup, OnboardingStack, loadState] = useServices([
    TOKENS.HOOK_USE_AGENT_SETUP,
    TOKENS.STACK_ONBOARDING,
    TOKENS.LOAD_STATE,
  ])
  const { agent, initializeAgent, shutdownAndClearAgentIfExists } = useAgentSetup()
  const [onboardingComplete, setOnboardingComplete] = useState(false)
  const { loading } = useInitializeBCSC()

  const shouldRenderMainStack = useMemo(
    () => onboardingComplete && store.authentication.didAuthenticate,
    [onboardingComplete, store.authentication.didAuthenticate]
  )

  useEffect(() => {
    // if user gets locked out, erase agent
    if (!store.authentication.didAuthenticate) {
      shutdownAndClearAgentIfExists()
    }
  }, [store.authentication.didAuthenticate, shutdownAndClearAgentIfExists])

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(EventTypes.DID_COMPLETE_ONBOARDING, () => {
      setOnboardingComplete(true)
    })

    return sub.remove
  }, [])

  useEffect(() => {
    // Load state only if it hasn't been loaded yet
    if (store.stateLoaded) return

    loadState(dispatch).catch((err: unknown) => {
      const error = new BifoldError(t('Error.Title1044'), t('Error.Message1044'), (err as Error).message, 1001)

      DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error)
    })
  }, [dispatch, loadState, t, store.stateLoaded])

  if (shouldRenderMainStack && agent) {
    return (
      <AgentProvider agent={agent}>
        <OpenIDCredentialRecordProvider>
          {loading ? <TempLoadingView /> : store.bcsc.verified ? <BCSCMainStack /> : <VerifyIdentityStack />}
        </OpenIDCredentialRecordProvider>
      </AgentProvider>
    )
  }

  // use same onboarding stack as bifold / bcwallet for now
  return <OnboardingStack agent={agent} initializeAgent={initializeAgent} />
}

export default BCSCRootStack
