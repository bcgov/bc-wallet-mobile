import {
  getRootRouteKey,
  getRootTransition,
  IDLE_ROOT_TRANSITION,
  RootPhase,
  RootRoute,
  RootTransitionContext,
} from './root-transition'

const NO_ANIMATION = { animationEnabled: false }
const PUSH = { animationEnabled: true, animationTypeForReplace: 'push' }
const POP = { animationEnabled: true, animationTypeForReplace: 'pop' }

const route = (phase: RootPhase, verifyStackKey?: string): RootRoute => ({ phase, verifyStackKey })
const settled: RootTransitionContext = { globalLoading: false, leavingStartedVerification: false }

describe('getRootRouteKey', () => {
  it('tells the verify stack registrations apart by their navigation key', () => {
    expect(getRootRouteKey(route('main'))).toBe('main')
    expect(getRootRouteKey(route('verify', 'verify'))).toBe('verify:verify')
    expect(getRootRouteKey(route('verify', 'verify-outage-fallback'))).toBe('verify:verify-outage-fallback')
  })
})

describe('getRootTransition', () => {
  it('settles on animated options so a later pop of the route animates', () => {
    expect(IDLE_ROOT_TRANSITION).toEqual({ animationEnabled: true })
  })

  it.each<[string, RootRoute | undefined, RootRoute]>([
    ['the first render', undefined, route('main')],
    ['the startup loading route to Home', route('loading'), route('main')],
    ['the startup loading route to the verify flow', route('loading'), route('verify', 'verify')],
    ['the startup loading route to the lock screen', route('loading'), route('auth')],
  ])('does not animate %s', (_name, previous, next) => {
    expect(getRootTransition(previous, next, settled)).toEqual(NO_ANIMATION)
  })

  // The agent provider is disabled and the store cleared in the same commit, so the outgoing stack must
  // unmount at once rather than linger for a slide
  it.each<[string, RootRoute, RootRoute]>([
    ['a lock from Home', route('main'), route('auth')],
    ['a lock from the verify flow', route('verify', 'verify'), route('auth')],
    ['removing the account from Home', route('main'), route('onboarding')],
    ['a factory reset from the verify flow', route('verify', 'verify'), route('onboarding')],
    ['a return to the loading route', route('main'), route('loading')],
  ])('cuts to the auth, onboarding or loading phase on %s, whatever else is going on', (_name, previous, next) => {
    expect(getRootTransition(previous, next, settled)).toEqual(NO_ANIMATION)
    expect(getRootTransition(previous, next, { globalLoading: true, leavingStartedVerification: true })).toEqual(
      NO_ANIMATION
    )
  })

  it('does not animate a swap hidden by the global loading overlay', () => {
    expect(
      getRootTransition(route('onboarding'), route('verify', 'verify'), { ...settled, globalLoading: true })
    ).toEqual(NO_ANIMATION)
    expect(
      getRootTransition(route('verify', 'verify'), route('main'), {
        globalLoading: true,
        leavingStartedVerification: true,
      })
    ).toEqual(NO_ANIMATION)
  })

  it('does not animate the verify stack re-registering under a new navigation key', () => {
    expect(getRootTransition(route('verify', 'verify-outage-fallback'), route('verify', 'verify'), settled)).toEqual(
      NO_ANIMATION
    )
  })

  it('pops back to Home when leaving a started, unfinished verification', () => {
    expect(
      getRootTransition(route('verify', 'verify'), route('main'), { ...settled, leavingStartedVerification: true })
    ).toEqual(POP)
  })

  it('pushes Home when skipping the fresh prompt or finishing verification', () => {
    expect(getRootTransition(route('verify', 'verify'), route('main'), settled)).toEqual(PUSH)
    expect(getRootTransition(route('verify', 'verify-outage-fallback'), route('main'), settled)).toEqual(PUSH)
  })

  it.each<[string, RootRoute, RootRoute]>([
    ['onboarding completes into the verify prompt', route('onboarding'), route('verify', 'verify')],
    ['onboarding completes into Home', route('onboarding'), route('main')],
    ['an unlock reaches Home', route('auth'), route('main')],
    ['an unlock resumes verification', route('auth'), route('verify', 'verify')],
    ['an unlock needs session recovery', route('auth'), route('recovery')],
    ['verification starts from Home', route('main'), route('verify', 'verify')],
    ['recovery continues into verification', route('recovery'), route('verify', 'verify')],
    ['recovery continues into Home', route('recovery'), route('main')],
  ])('pushes when %s', (_name, previous, next) => {
    expect(getRootTransition(previous, next, settled)).toEqual(PUSH)
    // Leaving verification is a verify → main thing only
    expect(getRootTransition(previous, next, { ...settled, leavingStartedVerification: true })).toEqual(PUSH)
  })
})
