import { StackNavigationOptions } from '@react-navigation/stack'
import { RootPhase } from '../state/root/root-phase'

/** Identity of the one route the root registers: the phase, and for the verify phase its navigation key. */
export type RootRoute = { phase: RootPhase; verifyStackKey?: string }

export type RootTransition = Pick<StackNavigationOptions, 'animationEnabled' | 'animationTypeForReplace'>

export type RootTransitionContext = {
  /** The global loading overlay is up, so the swap is not visible. */
  globalLoading: boolean
  /** The user started verification and has not finished it: `verify → main` is them leaving the flow. */
  leavingStartedVerification: boolean
  /** The session loads the user's account (a verified user), so the session's first Home waits for it. */
  sessionLoadsAccount: boolean
}

/**
 * The options a route settles on once it has entered. A route that keeps `animationEnabled: false`
 * after entering would later be popped without an animation: a popped card exits with its own,
 * stale options, not the incoming route's.
 */
export const IDLE_ROOT_TRANSITION: RootTransition = { animationEnabled: true }

const NO_ANIMATION: RootTransition = { animationEnabled: false }

// These phases are entered by a lock, a factory reset or a removed account. The agent provider is
// disabled in the same commit and the store is cleared under the outgoing stack, so a lingering stack
// could call into a context that is gone (useBCSCAgent throws into the error boundary). It unmounts at once.
const PHASES_ENTERED_WITHOUT_ANIMATION: ReadonlySet<RootPhase> = new Set([
  RootPhase.Loading,
  RootPhase.Auth,
  RootPhase.Onboarding,
])

/**
 * Whether `phase` belongs to a signed-in session. The agent, the account and the record of which system
 * checks have run are enabled for these phases only, so a change between them keeps what the session loaded.
 *
 * @param phase - The phase.
 * @returns True for the verify and main phases.
 */
export const isSessionPhase = (phase: RootPhase): boolean => phase === RootPhase.Verify || phase === RootPhase.Main

/**
 * A string identity for the root's registered route, for telling one registration from the next.
 * Equal keys mean React Navigation keeps the route; a different key means it replaces the route.
 *
 * @param route - The registered route.
 * @returns The phase, with the verify navigation key appended when there is one.
 */
export const getRootRouteKey = ({ phase, verifyStackKey }: RootRoute): string =>
  verifyStackKey ? `${phase}:${verifyStackKey}` : phase

/**
 * Decides how the root animates the swap from `previous` to `next`, as screen options for `next`.
 * React Navigation reads `animationEnabled` and `animationTypeForReplace` from the incoming route:
 * `'push'` slides the new route in over the old one, `'pop'` slides the old one out over the new.
 *
 * @param previous - The route being replaced; undefined on the first render.
 * @param next - The route being registered.
 * @param context - What else decides the direction, see {@link RootTransitionContext}.
 * @returns The screen options for the incoming route.
 */
export const getRootTransition = (
  previous: RootRoute | undefined,
  next: RootRoute,
  { globalLoading, leavingStartedVerification, sessionLoadsAccount }: RootTransitionContext
): RootTransition => {
  // Startup: the loading route is the overlay, there is nothing to slide from
  if (previous === undefined || previous.phase === RootPhase.Loading) {
    return NO_ANIMATION
  }

  if (PHASES_ENTERED_WITHOUT_ANIMATION.has(next.phase)) {
    return NO_ANIMATION
  }

  if (globalLoading) {
    return NO_ANIMATION
  }

  // A navigation key change within a phase (the outage fallback) re-registers the same stack
  if (previous.phase === next.phase) {
    return NO_ANIMATION
  }

  // The session starts with this change, and a verified session's first Home waits for the account to
  // load: a slide would carry in a blank card, so it is cut and the main stack shows the waiting screen
  if (next.phase === RootPhase.Main && !isSessionPhase(previous.phase) && sessionLoadsAccount) {
    return NO_ANIMATION
  }

  if (previous.phase === RootPhase.Verify && next.phase === RootPhase.Main) {
    // Leaving mid-flow (back arrow, "Back to home", Skip after walking back to the prompt) goes back to
    // Home; Skip on the fresh prompt and Setup Complete move forward into it
    return { animationEnabled: true, animationTypeForReplace: leavingStartedVerification ? 'pop' : 'push' }
  }

  return { animationEnabled: true, animationTypeForReplace: 'push' }
}
