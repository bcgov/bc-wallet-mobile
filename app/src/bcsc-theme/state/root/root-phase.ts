/**
 * The phases of the app, in order of precedence. The root navigator registers the current phase's
 * route only, so a phase change swaps the registered route: React Navigation drops the previous
 * phase's screens and mounts the new ones, animating the swap like a `replace`. No imperative
 * navigation is involved; `getRootTransition` decides how each swap animates.
 */
export enum RootPhase {
  /** Startup: the app is not ready, or a would-resume user is waiting on the IAS status */
  Loading = 'loading',
  Onboarding = 'onboarding',
  /** Locked */
  Auth = 'auth',
  /** Unlocked, but the session's tokens could not be read */
  Recovery = 'recovery',
  /** The verify journey: the prompt, a pending resume or verification in progress */
  Verify = 'verify',
  Main = 'main',
}

/** What the store and the root's ViewModel know; the rule below is the only place that turns these into a phase. */
export interface RootPhaseFacts {
  /** State, API client and account are all ready */
  appReady: boolean
  /** A user who would resume verification is still waiting on the IAS status */
  awaitingStatusForResume: boolean
  /** An account exists on this device */
  hasAccount: boolean
  /** The app is unlocked */
  didAuthenticate: boolean
  /** The account record is there but its tokens could not be read. Missing means no recovery is needed */
  sessionRecoveryRequired?: boolean
  /** The verify journey is due: the prompt, a pending resume or verification in progress */
  showVerifyStack: boolean
}

/**
 * The single definition of the phase the app is in; the first matching check wins. See {@link RootPhase}
 * for how the root registers it.
 *
 * @param facts - What the store and the root's ViewModel know.
 * @returns The phase whose route the root registers.
 */
export const getRootPhase = (facts: RootPhaseFacts): RootPhase => {
  const { appReady, awaitingStatusForResume, hasAccount, didAuthenticate, sessionRecoveryRequired, showVerifyStack } =
    facts

  // Loading until the app is ready and, for a would-resume user, IAS status is known
  if (!appReady || awaitingStatusForResume) {
    return RootPhase.Loading
  }

  if (hasAccount === false) {
    return RootPhase.Onboarding
  }

  if (didAuthenticate === false) {
    return RootPhase.Auth
  }

  if (sessionRecoveryRequired === true) {
    return RootPhase.Recovery
  }

  return showVerifyStack ? RootPhase.Verify : RootPhase.Main
}
