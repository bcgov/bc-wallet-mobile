import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { ErrorRegistry } from '@/errors'
import { BCDispatchAction, BCState } from '@/store'
import { isProductionBundle, isProductionEnvironment } from '@/utils/environment'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useInitializeAccountStatus } from '../api/hooks/useInitializeAccountStatus'
import useThirdPartyKeyboardWarning from '../api/hooks/useThirdPartyKeyboardWarning'
import { useLoadingScreen } from '../contexts/BCSCLoadingContext'
import { useServerStatus } from '../contexts/ServerStatusContext'
import { useFcmService } from '../features/fcm'
import { useBCSCApiClientState } from '../hooks/useBCSCApiClient'
import { SystemCheckScope, useSystemChecks } from '../hooks/useSystemChecks'
import { RootPhase } from '../state/root/root-phase'
import { useRootPhase } from '../state/root/useRootPhase'
import { useVerificationState } from '../state/verification/useVerificationState'
import { toAppError } from '../utils/native-error-map'
import {
  getRootRouteKey,
  getRootTransition,
  IDLE_ROOT_TRANSITION,
  isSessionPhase,
  RootRoute,
  RootTransition,
  RootTransitionContext,
} from './root-transition'

/**
 * Decides whether the root shows the verify journey: the once-per-session auto-resume for a user who
 * has started verification, the verify prompt, and the outage fallback that stands in for the resume
 * while IAS is down. A session runs from startup or unlock to the next lock. `appReady`: state, API
 * client and account are all ready.
 */
const useVerificationRouting = (appReady: boolean) => {
  const [store, dispatch] = useStore<BCState>()
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
      dispatch({ type: BCDispatchAction.UPDATE_SECURE_IN_VERIFY_FLOW, payload: [true] })
    }
  }, [dispatch, resumeEvaluated, appReady, signedIn, serverStatusChecked, isServerAvailable, wantsToResumeVerification])

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

/**
 * The screen options of the root's one registered route. A route change is decided once, in the render
 * that registers the new route, from the route it replaces. The options then settle on
 * {@link IDLE_ROOT_TRANSITION} once the route has entered, so a later change can pop it with an animation.
 */
const useRootTransition = (route: RootRoute, context: RootTransitionContext): RootTransition => {
  const routeKey = getRootRouteKey(route)
  // The latest route change: the route it registered, which the next change leaves from, and its options
  const [swap, setSwap] = useState<{ routeKey: string; route: RootRoute; transition: RootTransition }>()
  const [enteredRouteKey, setEnteredRouteKey] = useState<string>()

  if (swap?.routeKey !== routeKey) {
    // Decided during the render, so it holds for any render before the route has entered: deciding again
    // from the live context could turn the animation off mid-slide, which snaps the card into place
    setSwap({ routeKey, route, transition: getRootTransition(swap?.route, route, context) })
  }

  useEffect(() => {
    setEnteredRouteKey(routeKey)
  }, [routeKey])

  const entered = enteredRouteKey === routeKey

  return !entered && swap?.routeKey === routeKey ? swap.transition : IDLE_ROOT_TRANSITION
}

export interface RootStackViewModel {
  /**
   * Whether a production bundle is pointed at a non-production environment. The root then shows the
   * recovery screen in place of every route, whatever the phase, until the environment is valid again.
   */
  showInvalidEnvironment: boolean
  /** The phase whose route the root registers; see {@link RootPhase}. */
  phase: RootPhase
  /** How the latest phase change animates, as the screen options of the registered route. */
  transition: RootTransition
  /**
   * Whether the user is in a signed-in session: the verify and main phases. The agent, the account and the
   * record of which system checks have run are enabled for exactly these phases, mounted above the root's
   * route, so a verify ↔ main change never restarts them and a stack that mounts again mid-session shows at
   * once, with nothing left to wait for. Entering any other phase ends the session and clears them; those
   * phases are entered without an animation, so no stack lingers without them.
   */
  inSession: boolean
  /** Whether the main stack mounts under the id-token provider. */
  isVerified: boolean
  /** The verify route's navigation key. A change drops the route and registers it afresh. */
  verifyStackKey: string
  /** Whether the verify stack opens on the one-time verify prompt rather than the user's resume step. */
  showVerifyPrompt: boolean
  /** Settles the prompt, and the startup resume with it, when the user answers it. */
  onVerifyPromptAnswered: () => void
}

/**
 * The root navigator's ViewModel. Loads the persisted state on startup, runs the startup system checks,
 * processes pending FCM challenges once the API client is ready, routes the verify journey, and decides
 * how each phase change animates. The phase whose route the root registers comes from `useRootPhase`.
 * `BCSCRootStack` renders that route and the session providers above it.
 *
 * @returns The registered phase, its transition and the session flags; see {@link RootStackViewModel}.
 */
export const useRootStackViewModel = (): RootStackViewModel => {
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const [loadState] = useServices([TOKENS.LOAD_STATE])
  const { isClientReady } = useBCSCApiClientState()
  const fcmService = useFcmService()
  const { emitErrorModal } = useErrorAlert()
  const { initializingAccount } = useInitializeAccountStatus()
  const { isVerified, isDeviceVerifiedByIas } = useVerificationState()
  const { isLoading: globalLoading } = useLoadingScreen()
  useSystemChecks(SystemCheckScope.STARTUP)
  useThirdPartyKeyboardWarning()

  // State, API client and account are all ready
  const appReady = store.stateLoaded && isClientReady && !initializingAccount
  const { awaitingStatusForResume, showVerifyStack, showVerifyPrompt, verifyStackKey, onVerifyPromptAnswered } =
    useVerificationRouting(appReady)

  // Wait until the apiClient is ready and process any pending FCM Challenges
  useEffect(() => {
    if (isClientReady) {
      void fcmService.viewModel.processPendingChallenges()
    }
  }, [isClientReady, fcmService.viewModel])

  useEffect(() => {
    // Load state only if it hasn't been loaded yet
    if (store.stateLoaded) {
      return
    }

    try {
      void loadState(dispatch)
    } catch (err) {
      emitErrorModal(t('Error.Problem'), t('Error.ProblemDescription'), toAppError(err, ErrorRegistry.STATE_LOAD_ERROR))
    }
  }, [dispatch, loadState, store.stateLoaded, emitErrorModal, t])

  // Recovery gate: blocks every stack, independent of account state, until the environment is valid again
  // TODO (MD): Remove this gate after all users are on v4.2.0+
  const showInvalidEnvironment =
    store.stateLoaded && isProductionBundle() && !isProductionEnvironment(store.developer.environment)

  const phase = useRootPhase({ appReady, awaitingStatusForResume, showVerifyStack })
  const transition = useRootTransition(
    { phase, verifyStackKey: phase === RootPhase.Verify ? verifyStackKey : undefined },
    {
      globalLoading,
      // Started and unfinished: a verify → main change is the user leaving the flow, so Home comes back
      // from beneath rather than sliding in over it
      leavingStartedVerification: store.bcsc.verificationStarted === true && !isVerified,
      // The users BCSCAccountProvider loads an account for
      sessionLoadsAccount: isDeviceVerifiedByIas,
    }
  )
  const inSession = isSessionPhase(phase)

  return {
    showInvalidEnvironment,
    phase,
    transition,
    inSession,
    isVerified,
    verifyStackKey,
    showVerifyPrompt,
    onVerifyPromptAnswered,
  }
}
