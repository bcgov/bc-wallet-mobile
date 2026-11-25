import { getRootPhase, RootPhase, RootPhaseFacts } from './root-phase'

// Ready, with an account, unlocked and nothing else going on: Home
const facts = (overrides: Partial<RootPhaseFacts> = {}): RootPhaseFacts => ({
  appReady: true,
  awaitingStatusForResume: false,
  hasAccount: true,
  didAuthenticate: true,
  showVerifyStack: false,
  ...overrides,
})

describe('getRootPhase', () => {
  it.each<[string, Partial<RootPhaseFacts>, RootPhase]>([
    ['loading until the app is ready', { appReady: false }, RootPhase.Loading],
    [
      'loading until the IAS status is known for a would-resume user',
      { awaitingStatusForResume: true },
      RootPhase.Loading,
    ],
    ['onboarding when there is no account', { hasAccount: false, didAuthenticate: false }, RootPhase.Onboarding],
    ['auth when there is an account and the app is locked', { didAuthenticate: false }, RootPhase.Auth],
    ['recovery when session recovery is required', { sessionRecoveryRequired: true }, RootPhase.Recovery],
    ['verify when unlocked and the verify journey is due', { showVerifyStack: true }, RootPhase.Verify],
    ['main when unlocked and the verify journey is not due', {}, RootPhase.Main],
    ['main when session recovery is not required', { sessionRecoveryRequired: false }, RootPhase.Main],
  ])('is %s', (_name, overrides, expectedPhase) => {
    expect(getRootPhase(facts(overrides))).toBe(expectedPhase)
  })

  // The order of precedence: each phase wins over every phase listed after it
  const everythingAtOnce: Partial<RootPhaseFacts> = {
    appReady: false,
    awaitingStatusForResume: true,
    hasAccount: false,
    didAuthenticate: false,
    sessionRecoveryRequired: true,
    showVerifyStack: true,
  }

  it.each<[string, Partial<RootPhaseFacts>, RootPhase]>([
    ['loading over every other phase', {}, RootPhase.Loading],
    [
      'onboarding over a lock, recovery and the verify journey',
      { appReady: true, awaitingStatusForResume: false },
      RootPhase.Onboarding,
    ],
    [
      'auth over recovery and the verify journey',
      { appReady: true, awaitingStatusForResume: false, hasAccount: true },
      RootPhase.Auth,
    ],
    [
      // Recovery must win: the verify stack starts on the session recovery screen while it is required
      'recovery over the verify journey',
      { appReady: true, awaitingStatusForResume: false, hasAccount: true, didAuthenticate: true },
      RootPhase.Recovery,
    ],
  ])('puts %s', (_name, overrides, expectedPhase) => {
    expect(getRootPhase(facts({ ...everythingAtOnce, ...overrides }))).toBe(expectedPhase)
  })
})
