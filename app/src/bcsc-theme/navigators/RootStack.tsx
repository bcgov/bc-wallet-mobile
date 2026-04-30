import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { useNavigationContainer } from '@/contexts/NavigationContainerContext'
import { ErrorRegistry } from '@/errors'
import { BCState, VerificationStatus } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useInitializeAccountStatus } from '../api/hooks/useInitializeAccountStatus'
import useThirdPartyKeyboardWarning from '../api/hooks/useThirdPartyKeyboardWarning'
import { BCSCAccountProvider } from '../contexts/BCSCAccountContext'
import { BCSCActivityProvider } from '../contexts/BCSCActivityContext'
import { LoadingScreen } from '../contexts/BCSCLoadingContext'
import BCSCAgentProvider from '../features/agent/BCSCAgentProvider'
import { useFcmService } from '../features/fcm'
import { useBCSCApiClientState } from '../hooks/useBCSCApiClient'
import { SystemCheckScope, useSystemChecks } from '../hooks/useSystemChecks'
import { toAppError } from '../utils/native-error-map'
import AuthStack from './AuthStack'
import BCSCMainStack from './MainStack'
import OnboardingStack from './OnboardingStack'
import PromptStack from './PromptStack'
import VerifyStack from './VerifyStack'

const BCSCRootStack: React.FC = () => {
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const [loadState] = useServices([TOKENS.LOAD_STATE])
  const { isClientReady } = useBCSCApiClientState()
  const fcmService = useFcmService()
  const { emitErrorModal } = useErrorAlert()
  const { isNavigationReady } = useNavigationContainer()
  const { initializingAccount } = useInitializeAccountStatus()
  useSystemChecks(SystemCheckScope.STARTUP)
  useThirdPartyKeyboardWarning()

  // Wait until the apiClient is ready and process any pending FCM Challenges
  useEffect(() => {
    if (isClientReady) {
      fcmService.viewModel.processPendingChallenges()
    }
  }, [isClientReady, fcmService.viewModel])

  useEffect(() => {
    // Load state only if it hasn't been loaded yet
    if (store.stateLoaded) {
      return
    }

    try {
      loadState(dispatch)
    } catch (err) {
      emitErrorModal(t('Error.Problem'), t('Error.ProblemDescription'), toAppError(err, ErrorRegistry.STATE_LOAD_ERROR))
    }
  }, [dispatch, loadState, store.stateLoaded, emitErrorModal, t])

  // Show loading screen if state, API client or navigation is not ready
  if (!store.stateLoaded || !isClientReady || initializingAccount || !isNavigationReady) {
    return <LoadingScreen message={t('BCSC.Loading.AppStartup')} />
  }

  if (store.bcsc.hasAccount === false) {
    return <OnboardingStack />
  }

  if (store.authentication.didAuthenticate === false) {
    return <AuthStack />
  }

  const shouldShowVerifyPrompt =
    store.bcsc.hasSeenVerifyPrompt === false &&
    store.bcscSecure.verified !== true &&
    store.bcscSecure.verifiedStatus !== VerificationStatus.IN_PROGRESS &&
    store.bcscSecure.verifiedStatus !== VerificationStatus.VERIFIED

  if (shouldShowVerifyPrompt) {
    return <PromptStack />
  }

  return (
    <BCSCAgentProvider>
      {store.bcscSecure.verified === false && store.bcscSecure.verifiedStatus === VerificationStatus.IN_PROGRESS ? (
        <BCSCActivityProvider>
          <VerifyStack />
        </BCSCActivityProvider>
      ) : (
        <BCSCActivityProvider>
          <BCSCAccountProvider>
            {/* <BCSCIdTokenProvider> */}
            <BCSCMainStack />
            {/* </BCSCIdTokenProvider> */}
          </BCSCAccountProvider>
        </BCSCActivityProvider>
      )}
    </BCSCAgentProvider>
  )
}

export default BCSCRootStack
