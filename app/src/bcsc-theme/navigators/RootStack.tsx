import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { useNavigationContainer } from '@/contexts/NavigationContainerContext'
import { ErrorRegistry } from '@/errors'
import { BCState } from '@/store'
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
import { SystemCheckScope, useSystemChecks } from '../hooks/useSystemChecks'
import { useVerificationStatus } from '../hooks/useVerificationStatus'
import { toAppError } from '../utils/native-error-map'
import AuthStack from './AuthStack'
import BCSCMainStack from './MainStack'
import OnboardingStack from './OnboardingStack'
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
  const { needsVerification, isVerified, isVerificationInProgress } = useVerificationStatus()
  const onboardedThisSession = useRef(false)
  const [verifyPromptAnswered, setVerifyPromptAnswered] = useState(false)
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
    onboardedThisSession.current = true
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

  // The prompt is a one-time hand-off from onboarding into verification: offer it only to a user who
  // just finished onboarding, has yet to answer it, and has no verification to finish or resume.
  // Everyone else reaches verification from the MainStack, which resumes them at their current step.
  const showVerifyPrompt = onboardedThisSession.current && !verifyPromptAnswered && needsVerification

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
