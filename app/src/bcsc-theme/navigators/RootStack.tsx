import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { useNavigationContainer } from '@/contexts/NavigationContainerContext'
import { ErrorRegistry } from '@/errors'
import { BCDispatchAction, BCState, VerificationStatus } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useInitializeAccountStatus } from '../api/hooks/useInitializeAccountStatus'
import useThirdPartyKeyboardWarning from '../api/hooks/useThirdPartyKeyboardWarning'
import { BCSCAccountProvider } from '../contexts/BCSCAccountContext'
import { BCSCActivityProvider } from '../contexts/BCSCActivityContext'
import { BCSCIdTokenProvider } from '../contexts/BCSCIdTokenContext'
import { LoadingScreen } from '../contexts/BCSCLoadingContext'
import { useServerStatus } from '../contexts/ServerStatusContext'
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

/**
 * Decides whether the root shows the verify journey: the once-per-session auto-resume for a user who
 * has started verification, the verify prompt, and the outage fallback that stands in for the resume
 * while IAS is down. A session runs from startup or unlock to the next lock. `appReady`: state, API
 * client, account and navigation are all ready.
 */
const useVerificationRouting = (appReady: boolean) => {
  const [store, dispatch] = useStore<BCState>()
  const { needsVerification, isVerified, isVerificationInProgress, isDeactivated } = useVerificationStatus()
  const { isAvailable: isServerAvailable, hasChecked: serverStatusChecked } = useServerStatus()
  const [verifyPromptAnswered, setVerifyPromptAnswered] = useState(false)
  // Once per session: whether the auto-resume below has been decided. State, not a ref, so the
  // render stops reading "started, not in progress" as a pending resume once it has — every exit from
  // the verify flow produces exactly that state on purpose.
  const [resumeEvaluated, setResumeEvaluated] = useState(false)

  // Removing the account (factory reset) and locking both leave RootStack mounted, so these session flags
  // are reset by hand: onboarding again after a removal is due the prompt like a fresh install, and an
  // unlock resumes a started verification like a relaunch does (the lock cleared the in-progress status)
  useEffect(() => {
    if (store.bcsc.hasAccount === false || store.authentication.didAuthenticate === false) {
      setVerifyPromptAnswered(false)
      setResumeEvaluated(false)
    }
  }, [store.bcsc.hasAccount, store.authentication.didAuthenticate])

  // Has an account, is unlocked and needs no session recovery: Home or Verify is the next screen
  const signedIn =
    store.bcsc.hasAccount &&
    store.authentication.didAuthenticate !== false &&
    store.bcscSecure.sessionRecoveryRequired !== true

  // Started verification (prompt, Home card, renewal or v3 upgrade), whether or not they skipped the
  // prompt, and has neither finished nor re-entered the flow yet. A deactivated card is renewed from
  // Home, not resumed
  const wantsToResumeVerification = store.bcsc.verificationStarted === true && needsVerification && !isDeactivated

  // A user who has started verification and is not verified is routed back to the step they left off on
  // Runs exactly once per session so the user isn't stuck in verification
  useEffect(() => {
    if (resumeEvaluated || !appReady || !signedIn || !serverStatusChecked) {
      return
    }

    // Verification can't resume during an outage. Leave `resumeEvaluated` unset so re-runs re-evaluate
    if (wantsToResumeVerification && !isServerAvailable) {
      return
    }

    // Both updates land in one render, so a resumed user never sees Home in between
    setResumeEvaluated(true)

    if (wantsToResumeVerification) {
      dispatch({ type: BCDispatchAction.UPDATE_SECURE_VERIFIED_STATUS, payload: [VerificationStatus.IN_PROGRESS] })
    }
  }, [dispatch, resumeEvaluated, appReady, signedIn, serverStatusChecked, isServerAvailable, wantsToResumeVerification])

  // Wait for server status before rendering app, if the server is down, the user will see the outage screen
  const awaitingStatusForResume = !serverStatusChecked && signedIn && wantsToResumeVerification && !verifyPromptAnswered

  // The auto-resume dispatch (effect above) hasn't landed yet. Keep VerifyStack mounted through this
  // window so Home doesn't flash first, and so the outage fallback has a stack for its prompt. Once
  // evaluated only IN_PROGRESS keeps the stack up, so leaving (UNVERIFIED) swaps to MainStack and a
  // restart's UNVERIFIED → IN_PROGRESS remounts it at the first step.
  const pendingVerificationResume = !resumeEvaluated && serverStatusChecked && wantsToResumeVerification

  // During an outage the resume is held off, so fall back to the prompt — its inline ServiceOutage +
  // "skip" is the user's way to Home. Only at the start of a session: an outage that begins later is the
  // banner on Home, not this prompt.
  const resumeBlockedByOutage = pendingVerificationResume && !isServerAvailable

  // This prompt controls if the user is sent back into the verification stack or can continue into the main app
  // the value is only set when the user interacts with the prompt and is reset on a factory reset
  const showVerifyPrompt =
    !verifyPromptAnswered &&
    ((store.bcsc.verificationSkipped === undefined && needsVerification) || resumeBlockedByOutage)

  // Render the verify journey when the prompt is due, OR whenever verification is actively in
  // progress. Combining both into a single VerifyStack render keeps it mounted across the prompt →
  // in-progress transition, so VerifyPrompt → AccountSetup animates as an in-stack slide instead of
  // a RootStack swap.
  const showVerifyStack = showVerifyPrompt || pendingVerificationResume || (!isVerified && isVerificationInProgress)

  // Answering the prompt settles the startup resume too: Skip on the outage fallback is the user's way to
  // Home, so neither the pending resume nor IAS recovering later in the session may pull them back in
  const onVerifyPromptAnswered = useCallback(() => {
    setVerifyPromptAnswered(true)
    setResumeEvaluated(true)
  }, [])

  return {
    awaitingStatusForResume,
    showVerifyStack,
    showVerifyPrompt,
    verifyStackKey: resumeBlockedByOutage ? 'verify-outage-fallback' : 'verify',
    onVerifyPromptAnswered,
  }
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
  const { isVerified } = useVerificationStatus()
  useSystemChecks(SystemCheckScope.STARTUP)
  useThirdPartyKeyboardWarning()

  // State, API client, account and navigation are all ready
  const appReady = store.stateLoaded && isClientReady && !initializingAccount && isNavigationReady
  const { awaitingStatusForResume, showVerifyStack, showVerifyPrompt, verifyStackKey, onVerifyPromptAnswered } =
    useVerificationRouting(appReady)

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

  // Loading until the app is ready and, for a would-resume user, IAS status is known
  if (!appReady || awaitingStatusForResume) {
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

  return (
    <BCSCAgentProvider>
      {showVerifyStack ? (
        <BCSCActivityProvider>
          <VerifyStack
            key={verifyStackKey}
            showVerifyPrompt={showVerifyPrompt}
            onVerifyPromptAnswered={onVerifyPromptAnswered}
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
