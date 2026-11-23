import { useApp, useDeveloper, useHasAccount, useSession, useSessionRecoveryRequired } from '@/bcsc-theme/storage/hooks'
import { useNavigationContainer } from '@/contexts/NavigationContainerContext'
import { isProductionBundle, isProductionEnvironment } from '@/utils/environment'
import { TOKENS, useServices } from '@bifold/core'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import useThirdPartyKeyboardWarning from '../api/hooks/useThirdPartyKeyboardWarning'
import { BCSCAccountProvider } from '../contexts/BCSCAccountContext'
import { BCSCActivityProvider } from '../contexts/BCSCActivityContext'
import { BCSCIdTokenProvider } from '../contexts/BCSCIdTokenContext'
import { LoadingScreen } from '../contexts/BCSCLoadingContext'
import { useServerStatus } from '../contexts/ServerStatusContext'
import BCSCAgentProvider from '../features/agent/BCSCAgentProvider'
import { useFcmService } from '../features/fcm'
import { InvalidEnvironment } from '../features/modal/InvalidEnvironment'
import { useBCSCApiClientState } from '../hooks/useBCSCApiClient'
import { useCardStatus } from '../hooks/useCardStatus'
import { SystemCheckScope, useSystemChecks } from '../hooks/useSystemChecks'
import { useAccountPhase } from '../state/account/useAccountPhase'
import { useVerificationState } from '../state/verification/useVerificationState'
import AuthStack from './AuthStack'
import BCSCMainStack from './MainStack'
import OnboardingStack from './OnboardingStack'
import VerifyStack from './VerifyStack'

// Keeps FcmViewModel in sync with card expiry so it can drop challenges for expired users, and logs the
// card expiry phase when it changes (rendered once, so one line per change).
// Must live inside BCSCAccountProvider.
const FcmCardExpirySync: React.FC = () => {
  const { isExpired } = useCardStatus()
  const fcmService = useFcmService()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { phase } = useAccountPhase()

  useEffect(() => {
    fcmService.viewModel.setCardExpired(isExpired)
  }, [isExpired, fcmService.viewModel])

  useEffect(() => {
    logger.info(`[RootStack] Card expiry phase: ${phase}`)
  }, [phase, logger])

  return null
}

/**
 * Decides whether the root shows the verify journey: the once-per-session auto-resume for a user who
 * has started verification, the verify prompt, and the outage fallback that stands in for the resume
 * while IAS is down. A session runs from startup or unlock to the next lock. `appReady`: state, API
 * client and navigation are all ready.
 */
const useVerificationRouting = (appReady: boolean) => {
  const hasAccount = useHasAccount()
  const didAuthenticate = useSession((s) => s.didAuthenticate)
  const setInVerifyFlow = useSession((s) => s.setInVerifyFlow)
  const sessionRecoveryRequired = useSessionRecoveryRequired()
  const app = useApp()
  const { needsVerification, isVerified, isVerificationInProgress, isDeactivated } = useVerificationState()
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
    if (!hasAccount || didAuthenticate === false) {
      setVerifyPromptAnswered(false)
      setResumeEvaluated(false)
    }
  }, [hasAccount, didAuthenticate])

  // Has an account, is unlocked and needs no session recovery: Home or Verify is the next screen
  const signedIn = hasAccount && didAuthenticate !== false && !sessionRecoveryRequired

  // Started verification (prompt, Home card, renewal or v3 upgrade), whether or not they skipped the
  // prompt, and has neither finished nor re-entered the flow yet. A deactivated card is renewed from
  // Home, not resumed
  const wantsToResumeVerification = app.verificationStarted === true && needsVerification && !isDeactivated

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
      setInVerifyFlow(true)
    }
  }, [
    resumeEvaluated,
    appReady,
    signedIn,
    serverStatusChecked,
    isServerAvailable,
    wantsToResumeVerification,
    setInVerifyFlow,
  ])

  // Wait for server status before rendering app, if the server is down, the user will see the outage screen
  const awaitingStatusForResume = !serverStatusChecked && signedIn && wantsToResumeVerification && !verifyPromptAnswered

  // The auto-resume dispatch (effect above) hasn't landed yet. Keep VerifyStack mounted through this
  // window so Home doesn't flash first, and so the outage fallback has a stack for its prompt. Once
  // evaluated only being in the verify flow keeps the stack up, so leaving it swaps to MainStack and a
  // restart's leave → re-enter remounts it at the first step.
  const pendingVerificationResume = !resumeEvaluated && serverStatusChecked && wantsToResumeVerification

  // During an outage the resume is held off, so fall back to the prompt — its inline ServiceOutage +
  // "skip" is the user's way to Home. Only at the start of a session: an outage that begins later is the
  // banner on Home, not this prompt.
  const resumeBlockedByOutage = pendingVerificationResume && !isServerAvailable

  // This prompt controls if the user is sent back into the verification stack or can continue into the main app
  // the value is only set when the user interacts with the prompt and is reset on a factory reset
  const showVerifyPrompt =
    !verifyPromptAnswered && ((app.verificationSkipped === undefined && needsVerification) || resumeBlockedByOutage)

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
  const stateLoaded = useSession((s) => s.stateLoaded)
  const didAuthenticate = useSession((s) => s.didAuthenticate)
  const hasAccount = useHasAccount()
  const sessionRecoveryRequired = useSessionRecoveryRequired()
  const developer = useDeveloper()
  const { isClientReady } = useBCSCApiClientState()
  const fcmService = useFcmService()
  const { isNavigationReady } = useNavigationContainer()
  const { isVerified } = useVerificationState()
  useSystemChecks(SystemCheckScope.STARTUP)
  useThirdPartyKeyboardWarning()

  // State, API client and navigation are all ready
  const appReady = stateLoaded && isClientReady && isNavigationReady
  const { awaitingStatusForResume, showVerifyStack, showVerifyPrompt, verifyStackKey, onVerifyPromptAnswered } =
    useVerificationRouting(appReady)

  // Wait until the apiClient is ready and process any pending FCM Challenges
  useEffect(() => {
    if (isClientReady) {
      void fcmService.viewModel.processPendingChallenges()
    }
  }, [isClientReady, fcmService.viewModel])

  // Recovery gate: blocks every stack, independent of account state, until the environment is valid again
  // TODO (MD): Remove this gate after all users are on v4.2.0+
  if (stateLoaded && isProductionBundle() && !isProductionEnvironment(developer.environment)) {
    return <InvalidEnvironment />
  }

  // Loading until the app is ready and, for a would-resume user, IAS status is known
  if (!appReady || awaitingStatusForResume) {
    return <LoadingScreen message={t('BCSC.Loading.AppStartup')} />
  }

  if (!hasAccount) {
    return <OnboardingStack />
  }

  if (didAuthenticate === false) {
    return <AuthStack />
  }

  if (sessionRecoveryRequired) {
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
