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
import { getToken, TokenType } from 'react-native-bcsc-core'
import { SafeAreaView } from 'react-native-safe-area-context'

import { BCDispatchAction, BCState } from '@/store'
import client from '../api/client'
import useApi from '../api/hooks/useApi'
import VerifyIdentityStack from '../features/verify/VerifyIdentityStack'
import BCSCMainStack from './MainStack'

const TempLoadingView = () => {
  const { ColorPallet } = useTheme()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ColorPallet.brand.primaryBackground }}>
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
  const [loading, setLoading] = useState(true)
  const { registration } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const shouldRenderMainStack = useMemo(
    () => onboardingComplete && store.authentication.didAuthenticate,
    [onboardingComplete, store.authentication.didAuthenticate]
  )

  // TODO move into a hook
  useEffect(() => {
    registration.register().catch((error) => {
      logger.error(`Error during registration: ${error}`)
      // Handle error appropriately, e.g., show an alert or log it
    })

    if (!store.stateLoaded) {
      return
    }

    const checkIfVerified = async () => {
      console.log('khghgfhgfhjgfhgfhgjfhjgfh')
      try {
        setLoading(true)
        let token
        // take response and build the data
        if (!store.bcsc.refreshToken) {
          // fetch token data and save it son
          const tokenInfo = await getToken(TokenType.Refresh)
          token = tokenInfo?.token
          dispatch({ type: BCDispatchAction.UPDATE_REFRESH_TOKEN, payload: [token] })
        } else {
          token = store.bcsc.refreshToken
        }

        if (token) {
          logger.info('token found')
          await client.getTokensForRefreshToken(token)
          dispatch({ type: BCDispatchAction.UPDATE_VERIFIED, payload: [true] })
        }
      } catch (error) {
        logger.error(`Error setting API client tokens: ${error}`)
      } finally {
        setLoading(false)
      }
    }

    checkIfVerified()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
