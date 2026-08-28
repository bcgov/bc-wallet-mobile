import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { useNavigationContainer } from '@/contexts/NavigationContainerContext'
import { ErrorRegistry } from '@/errors'
import { BCDispatchAction, BCState, VerificationStatus } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useInitializeAccountStatus } from '../api/hooks/useInitializeAccountStatus'
import useThirdPartyKeyboardWarning from '../api/hooks/useThirdPartyKeyboardWarning'
import { BCSCAccountProvider } from '../contexts/BCSCAccountContext'
import { BCSCActivityProvider } from '../contexts/BCSCActivityContext'
import { BCSCIdTokenProvider } from '../contexts/BCSCIdTokenContext'
import { LoadingScreen } from '../contexts/BCSCLoadingContext'
import BCSCAgentProvider from '../features/agent/BCSCAgentProvider'
import { useFcmService } from '../features/fcm'
import { useBCSCApiClientState } from '../hooks/useBCSCApiClient'
import { useCardStatus } from '../hooks/useCardStatus'
import { SystemCheckScope, useSystemChecks } from '../hooks/useSystemChecks'
import { useVerificationStatus } from '../hooks/useVerificationStatus'
import { toAppError } from '../utils/native-error-map'
import AuthStack from './AuthStack'
import BCSCMainStack from './MainStack'
import OnboardingStack from './OnboardingStack'
import VerifyStack from './VerifyStack'

// Keeps FcmViewModel in sync with card expiry so it can drop challenges for expired users.
// Must live inside BCSCAccountProvider.
const FcmCardExpirySync: React.FC = () => {
  const { isExpired } = useCardStatus()
  const fcmService = useFcmService()

  useEffect(() => {
    fcmService.viewModel.setCardExpired(isExpired)
  }, [isExpired, fcmService.viewModel])

  return null
}

const BCSCRootStack: React.FC = () => {
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const [loadState] = useServices([TOKENS.LOAD_STATE])
  const { isClientReady } = useBCSCApiClientState()
  const fcmService = useFcmService()
  const { emitErrorModal } = useErrorAlert()
  const { isNavigationReady } = useNavigationContainer()
  const { initializingAccount } = useInitializeAccountStatus()
  const { needsVerification, isVerified, isVerificationInProgress } = useVerificationStatus()
  const [verifyPromptAnswered, setVerifyPromptAnswered] = useState(false)
  const resumeEvaluated = useRef(false)
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

  // A user who chose "Skip" verification during onboarding and is not verified
  // will be routed to continue verification where they left off
  // Runs exactly once per session so the user isn't stuck in verification
  useEffect(() => {
    if (resumeEvaluated.current) {
      return
    }
    if (!store.stateLoaded || !isClientReady || initializingAccount || !isNavigationReady) {
      return
    }
    if (!store.bcsc.hasAccount || store.authentication.didAuthenticate === false) {
      return
    }
    if (store.bcscSecure.sessionRecoveryRequired === true) {
      return
    }

    resumeEvaluated.current = true

    if (store.bcsc.verificationSkipped === false && !isVerified && !isVerificationInProgress) {
      dispatch({ type: BCDispatchAction.UPDATE_SECURE_VERIFIED_STATUS, payload: [VerificationStatus.IN_PROGRESS] })
    }
  }, [
    dispatch,
    store.stateLoaded,
    isClientReady,
    initializingAccount,
    isNavigationReady,
    store.bcsc.hasAccount,
    store.bcsc.verificationSkipped,
    store.authentication.didAuthenticate,
    store.bcscSecure.sessionRecoveryRequired,
    isVerified,
    isVerificationInProgress,
  ])

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

  if (store.bcscSecure.sessionRecoveryRequired === true) {
    return (
      <BCSCActivityProvider>
        <VerifyStack />
      </BCSCActivityProvider>
    )
  }

  // This prompt controls if the user is sent back into the verification stack or can cotinue into the main app
  // the value is only set when the user interacts with the prompt and is reset on a factory reset
  const showVerifyPrompt = store.bcsc.verificationSkipped === undefined && !verifyPromptAnswered && needsVerification

  // Render the verify journey when the prompt is due, OR whenever verification is actively in
  // progress. Combining both into a single VerifyStack render keeps it mounted across the prompt →
  // in-progress transition, so VerifyPrompt → AccountSetup animates as an in-stack slide instead of
  // a RootStack swap.
  const showVerifyStack = showVerifyPrompt || (!isVerified && isVerificationInProgress)

  return (
    <BCSCAgentProvider>
      {showVerifyStack ? (
        <BCSCActivityProvider>
          <VerifyStack
            showVerifyPrompt={showVerifyPrompt}
            onVerifyPromptAnswered={() => setVerifyPromptAnswered(true)}
          />
        </BCSCActivityProvider>
      ) : (
        <BCSCActivityProvider>
          <BCSCAccountProvider>
            <FcmCardExpirySync />
            {isVerified ? (
              <BCSCIdTokenProvider>
                <BCSCMainStack />
              </BCSCIdTokenProvider>
            ) : (
              <BCSCMainStack />
            )}
          </BCSCAccountProvider>
        </BCSCActivityProvider>
      )}
    </BCSCAgentProvider>
  )
}

export default BCSCRootStack
