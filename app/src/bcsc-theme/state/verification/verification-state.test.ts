import { getVerificationState, VerificationFacts, VerificationState } from './verification-state'

const none: VerificationFacts = {
  hasCredential: false,
  credentialDeactivated: false,
  inVerifyFlow: false,
  hasRefreshToken: false,
}

const state = (overrides: Partial<VerificationState>): VerificationState => ({
  isVerified: false,
  isDeviceVerifiedByIas: false,
  isVerificationInProgress: false,
  isDeactivated: false,
  needsVerification: false,
  ...overrides,
})

describe('getVerificationState', () => {
  it.each<[string, Partial<VerificationFacts>, VerificationState]>([
    ['nothing', {}, state({ needsVerification: true })],
    ['a credential', { hasCredential: true }, state({ isVerified: true, isDeviceVerifiedByIas: true })],
    [
      'a credential deactivated during the session',
      { hasCredential: true, credentialDeactivated: true },
      state({ isVerified: true, isDeviceVerifiedByIas: true, isDeactivated: true }),
    ],
    [
      'a credential and the verify flow',
      { hasCredential: true, inVerifyFlow: true },
      state({ isVerified: true, isDeviceVerifiedByIas: true, isVerificationInProgress: true }),
    ],
    [
      'tokens without a credential (an account transfer, or a failed finish step)',
      { hasRefreshToken: true },
      state({ isDeviceVerifiedByIas: true, needsVerification: true }),
    ],
    [
      'tokens and a deactivated credential',
      { hasRefreshToken: true, credentialDeactivated: true },
      state({ isDeactivated: true, needsVerification: true }),
    ],
    [
      'tokens and the verify flow',
      { hasRefreshToken: true, inVerifyFlow: true },
      state({ isDeviceVerifiedByIas: true, isVerificationInProgress: true }),
    ],
    ['the verify flow without tokens', { inVerifyFlow: true }, state({ isVerificationInProgress: true })],
    [
      'a deactivated credential without tokens',
      { credentialDeactivated: true },
      state({ isDeactivated: true, needsVerification: true }),
    ],
  ])('with %s', (_name, facts, expected) => {
    expect(getVerificationState({ ...none, ...facts })).toEqual(expected)
  })
})
