import { RootPhase } from '../state/root/root-phase'
import {
  getRootRouteKey,
  getRootTransition,
  IDLE_ROOT_TRANSITION,
  RootRoute,
  RootTransitionContext,
} from './root-transition'

const NO_ANIMATION = { animationEnabled: false }
const PUSH = { animationEnabled: true, animationTypeForReplace: 'push' }
const POP = { animationEnabled: true, animationTypeForReplace: 'pop' }

const route = (phase: RootPhase, verifyStackKey?: string): RootRoute => ({ phase, verifyStackKey })
const settled: RootTransitionContext = {
  globalLoading: false,
  leavingStartedVerification: false,
  sessionLoadsAccount: false,
}

describe('getRootRouteKey', () => {
  it('tells the verify stack registrations apart by their navigation key', () => {
    expect(getRootRouteKey(route(RootPhase.Main))).toBe('main')
    expect(getRootRouteKey(route(RootPhase.Verify, 'verify'))).toBe('verify:verify')
    expect(getRootRouteKey(route(RootPhase.Verify, 'verify-outage-fallback'))).toBe('verify:verify-outage-fallback')
  })
})

describe('getRootTransition', () => {
  it('settles on animated options so a later pop of the route animates', () => {
    expect(IDLE_ROOT_TRANSITION).toEqual({ animationEnabled: true })
  })

  it.each<[string, RootRoute | undefined, RootRoute]>([
    ['the first render', undefined, route(RootPhase.Main)],
    ['the startup loading route to Home', route(RootPhase.Loading), route(RootPhase.Main)],
    ['the startup loading route to the verify flow', route(RootPhase.Loading), route(RootPhase.Verify, 'verify')],
    ['the startup loading route to the lock screen', route(RootPhase.Loading), route(RootPhase.Auth)],
  ])('does not animate %s', (_name, previous, next) => {
    expect(getRootTransition(previous, next, settled)).toEqual(NO_ANIMATION)
  })

  // The agent provider is disabled and the store cleared in the same commit, so the outgoing stack must
  // unmount at once rather than linger for a slide
  it.each<[string, RootRoute, RootRoute]>([
    ['a lock from Home', route(RootPhase.Main), route(RootPhase.Auth)],
    ['a lock from the verify flow', route(RootPhase.Verify, 'verify'), route(RootPhase.Auth)],
    ['removing the account from Home', route(RootPhase.Main), route(RootPhase.Onboarding)],
    ['a factory reset from the verify flow', route(RootPhase.Verify, 'verify'), route(RootPhase.Onboarding)],
    ['a return to the loading route', route(RootPhase.Main), route(RootPhase.Loading)],
  ])('cuts to the auth, onboarding or loading phase on %s, whatever else is going on', (_name, previous, next) => {
    expect(getRootTransition(previous, next, settled)).toEqual(NO_ANIMATION)
    expect(
      getRootTransition(previous, next, {
        globalLoading: true,
        leavingStartedVerification: true,
        sessionLoadsAccount: true,
      })
    ).toEqual(NO_ANIMATION)
  })

  it('does not animate a swap hidden by the global loading overlay', () => {
    expect(
      getRootTransition(route(RootPhase.Onboarding), route(RootPhase.Verify, 'verify'), {
        ...settled,
        globalLoading: true,
      })
    ).toEqual(NO_ANIMATION)
    expect(
      getRootTransition(route(RootPhase.Verify, 'verify'), route(RootPhase.Main), {
        ...settled,
        globalLoading: true,
        leavingStartedVerification: true,
      })
    ).toEqual(NO_ANIMATION)
  })

  // The session starts with the change, and Home waits for the account: a slide would carry in a blank card
  it.each<[string, RootRoute]>([
    ['an unlock', route(RootPhase.Auth)],
    ['session recovery', route(RootPhase.Recovery)],
  ])("cuts into a verified session's first Home after %s", (_name, previous) => {
    expect(getRootTransition(previous, route(RootPhase.Main), { ...settled, sessionLoadsAccount: true })).toEqual(
      NO_ANIMATION
    )
  })

  it('still slides a verified user between phases that do not start the session or wait for the account', () => {
    const verified = { ...settled, sessionLoadsAccount: true }

    // Within the session the account is already loaded
    expect(getRootTransition(route(RootPhase.Verify, 'verify'), route(RootPhase.Main), verified)).toEqual(PUSH)
    expect(getRootTransition(route(RootPhase.Main), route(RootPhase.Verify, 'verify'), verified)).toEqual(PUSH)
    // The verify flow does not wait for the account
    expect(getRootTransition(route(RootPhase.Auth), route(RootPhase.Verify, 'verify'), verified)).toEqual(PUSH)
  })

  it('does not animate the verify stack re-registering under a new navigation key', () => {
    expect(
      getRootTransition(route(RootPhase.Verify, 'verify-outage-fallback'), route(RootPhase.Verify, 'verify'), settled)
    ).toEqual(NO_ANIMATION)
  })

  it('pops back to Home when leaving a started, unfinished verification', () => {
    expect(
      getRootTransition(route(RootPhase.Verify, 'verify'), route(RootPhase.Main), {
        ...settled,
        leavingStartedVerification: true,
      })
    ).toEqual(POP)
  })

  it('pushes Home when skipping the fresh prompt or finishing verification', () => {
    expect(getRootTransition(route(RootPhase.Verify, 'verify'), route(RootPhase.Main), settled)).toEqual(PUSH)
    expect(
      getRootTransition(route(RootPhase.Verify, 'verify-outage-fallback'), route(RootPhase.Main), settled)
    ).toEqual(PUSH)
  })

  it.each<[string, RootRoute, RootRoute]>([
    ['onboarding completes into the verify prompt', route(RootPhase.Onboarding), route(RootPhase.Verify, 'verify')],
    ['onboarding completes into Home', route(RootPhase.Onboarding), route(RootPhase.Main)],
    ['an unlock reaches Home', route(RootPhase.Auth), route(RootPhase.Main)],
    ['an unlock resumes verification', route(RootPhase.Auth), route(RootPhase.Verify, 'verify')],
    ['an unlock needs session recovery', route(RootPhase.Auth), route(RootPhase.Recovery)],
    ['verification starts from Home', route(RootPhase.Main), route(RootPhase.Verify, 'verify')],
    ['recovery continues into verification', route(RootPhase.Recovery), route(RootPhase.Verify, 'verify')],
    ['recovery continues into Home', route(RootPhase.Recovery), route(RootPhase.Main)],
  ])('pushes when %s', (_name, previous, next) => {
    expect(getRootTransition(previous, next, settled)).toEqual(PUSH)
    // Leaving verification is a verify → main thing only
    expect(getRootTransition(previous, next, { ...settled, leavingStartedVerification: true })).toEqual(PUSH)
  })
})
