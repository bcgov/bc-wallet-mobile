import { BCState, initialState } from '@/store'
import { RootPhase } from './root-phase'
import { RootPhaseRoutingFacts, selectRootPhase } from './selectors'

const routing = (overrides: Partial<RootPhaseRoutingFacts> = {}): RootPhaseRoutingFacts => ({
  appReady: true,
  awaitingStatusForResume: false,
  showVerifyStack: false,
  ...overrides,
})

// An account that is unlocked, unless the overrides say otherwise
const buildState = (
  overrides: { hasAccount?: boolean; didAuthenticate?: boolean; sessionRecoveryRequired?: boolean } = {}
): BCState => ({
  ...initialState,
  bcsc: { ...initialState.bcsc, hasAccount: overrides.hasAccount ?? true },
  authentication: { ...initialState.authentication, didAuthenticate: overrides.didAuthenticate ?? true },
  bcscSecure: { ...initialState.bcscSecure, sessionRecoveryRequired: overrides.sessionRecoveryRequired },
})

describe('selectRootPhase', () => {
  it('is onboarding in the initial state, which has no account', () => {
    expect(selectRootPhase(initialState, routing())).toBe(RootPhase.Onboarding)
  })

  it('is main for an unlocked account', () => {
    expect(selectRootPhase(buildState(), routing())).toBe(RootPhase.Main)
  })

  it('reads the account flag as having an account', () => {
    expect(selectRootPhase(buildState({ hasAccount: false }), routing())).toBe(RootPhase.Onboarding)
  })

  it('reads the authentication flag as the app being unlocked', () => {
    expect(selectRootPhase(buildState({ didAuthenticate: false }), routing())).toBe(RootPhase.Auth)
  })

  it('reads the session recovery flag', () => {
    expect(selectRootPhase(buildState({ sessionRecoveryRequired: true }), routing())).toBe(RootPhase.Recovery)
  })

  it.each<[string, Partial<RootPhaseRoutingFacts>, RootPhase]>([
    ['the app not being ready', { appReady: false }, RootPhase.Loading],
    ['a wait on the IAS status', { awaitingStatusForResume: true }, RootPhase.Loading],
    ['the verify journey being due', { showVerifyStack: true }, RootPhase.Verify],
  ])('passes on %s from the routing facts', (_name, overrides, expectedPhase) => {
    expect(selectRootPhase(buildState(), routing(overrides))).toBe(expectedPhase)
  })
})
