import { getVerificationState, VerificationFacts, VerificationState } from './verification-state'

const none: VerificationFacts = {
  hasCredential: false,
  credentialDeactivated: false,
  inVerifyFlow: false,
  hasRefreshToken: false,
}

const verified = (isDeactivated = false): VerificationState => ({
  isDeactivated,
  isVerified: true,
  isDeviceVerifiedByIas: true,
  isVerificationInProgress: false,
  needsVerification: false,
})

type Unverified = Extract<VerificationState, { isVerified: false }>

const unverified = (overrides: Partial<Omit<Unverified, 'isVerified'>> = {}): VerificationState => ({
  isDeactivated: false,
  isDeviceVerifiedByIas: false,
  isVerificationInProgress: false,
  needsVerification: false,
  ...overrides,
  isVerified: false,
})

describe('getVerificationState', () => {
  it.each<[string, Partial<VerificationFacts>, VerificationState]>([
    ['nothing', {}, unverified({ needsVerification: true })],
    ['a credential', { hasCredential: true }, verified()],
    [
      'a credential deactivated during the session',
      { hasCredential: true, credentialDeactivated: true },
      verified(true),
    ],
    ['a credential and the verify flow', { hasCredential: true, inVerifyFlow: true }, verified()],
    [
      'tokens without a credential (an account transfer, or a failed finish step)',
      { hasRefreshToken: true },
      unverified({ isDeviceVerifiedByIas: true, needsVerification: true }),
    ],
    [
      'tokens and a deactivated credential',
      { hasRefreshToken: true, credentialDeactivated: true },
      unverified({ isDeactivated: true, needsVerification: true }),
    ],
    [
      'tokens and the verify flow',
      { hasRefreshToken: true, inVerifyFlow: true },
      unverified({ isDeviceVerifiedByIas: true, isVerificationInProgress: true }),
    ],
    ['the verify flow without tokens', { inVerifyFlow: true }, unverified({ isVerificationInProgress: true })],
    [
      'a deactivated credential without tokens',
      { credentialDeactivated: true },
      unverified({ isDeactivated: true, needsVerification: true }),
    ],
  ])('with %s', (_name, facts, expected) => {
    expect(getVerificationState({ ...none, ...facts })).toEqual(expected)
  })
})
