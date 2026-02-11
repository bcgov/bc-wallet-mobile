import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { useNavigationContainer } from '@/contexts/NavigationContainerContext'
import { BCDispatchAction, BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import React, { useEffect, useState } from 'react'
import { getAccount } from 'react-native-bcsc-core'
import { BCSCAccountProvider } from '../contexts/BCSCAccountContext'
import { BCSCActivityProvider } from '../contexts/BCSCActivityContext'
import { BCSCIdTokenProvider } from '../contexts/BCSCIdTokenContext'
import { LoadingScreenContent } from '../features/splash-loading/LoadingScreenContent'
import { useBCSCApiClientState } from '../hooks/useBCSCApiClient'
import { SystemCheckScope, useSystemChecks } from '../hooks/useSystemChecks'
import AuthStack from './AuthStack'
import BCSCMainStack from './MainStack'
import OnboardingStack from './OnboardingStack'
import VerifyStack from './VerifyStack'

const BCSCRootStack: React.FC = () => {
  const [store, dispatch] = useStore<BCState>()
  const [loadState] = useServices([TOKENS.LOAD_STATE])
  const { isClientReady } = useBCSCApiClientState()
  const [loading, setLoading] = useState(true)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { emitErrorModal } = useErrorAlert()
  const { isNavigationReady } = useNavigationContainer()
  useSystemChecks(SystemCheckScope.STARTUP)

  useEffect(() => {
    // Load state only if it hasn't been loaded yet
    if (store.stateLoaded) {
      return
    }

    try {
      loadState(dispatch)
    } catch (err) {
      emitErrorModal('STATE_LOAD_ERROR', { error: err })
    }
  }, [dispatch, loadState, emitErrorModal, store.stateLoaded])

  // Check for existing account on initial load - only runs after state is loaded
  // FIXME: This logic appears slightly too complex for the RootStack
  // consider moving to a system check ie: V3AccountRequiresMigrationSystemCheck
  useEffect(() => {
    if (!store.stateLoaded || !loading) {
      return
    }

    const asyncEffect = async () => {
      try {
        const account = await getAccount()

        dispatch({ type: BCDispatchAction.SET_HAS_ACCOUNT, payload: [Boolean(account)] })

        if (account?.nickname && !store.bcsc.nicknames.includes(account.nickname)) {
          dispatch({ type: BCDispatchAction.ADD_NICKNAME, payload: [account.nickname] })
        }
      } catch (error) {
        logger.error('Error checking for existing account:', error as Error)
        dispatch({ type: BCDispatchAction.SET_HAS_ACCOUNT, payload: [false] })
      } finally {
        setLoading(false)
      }
    }
    asyncEffect()
  }, [dispatch, loading, logger, store.bcsc.nicknames, store.stateLoaded])

  // Show loading screen if state, API client or navigation is not ready
  if (!store.stateLoaded || !isClientReady || loading || !isNavigationReady) {
    return <LoadingScreenContent />
  }

  if (!store.bcscSecure.hasAccount) {
    return <OnboardingStack />
  }

  if (!store.authentication.didAuthenticate) {
    return <AuthStack />
  }

  if (!store.bcscSecure.verified) {
    return (
      <BCSCActivityProvider>
        <VerifyStack />
      </BCSCActivityProvider>
    )
  }

  return (
    <BCSCActivityProvider>
      <BCSCAccountProvider>
        <BCSCIdTokenProvider>
          <BCSCMainStack />
        </BCSCIdTokenProvider>
      </BCSCAccountProvider>
    </BCSCActivityProvider>
  )
}

export default BCSCRootStack
