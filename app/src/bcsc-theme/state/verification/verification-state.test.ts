import { getVerificationState, VerificationFacts, VerificationState } from './verification-state'

const none: VerificationFacts = {
  hasCredential: false,
  credentialDeactivated: false,
  inVerifyFlow: false,
  hasRefreshToken: false,
}

type Flags = Pick<VerificationState, 'isVerificationInProgress' | 'isDeactivated'>
const noFlags: Flags = { isVerificationInProgress: false, isDeactivated: false }

const verified = (flags: Partial<Flags> = {}): VerificationState => ({
  ...noFlags,
  ...flags,
  isVerified: true,
  isDeviceVerifiedByIas: true,
  needsVerification: false,
})

const unverified = (
  overrides: Partial<Flags & { isDeviceVerifiedByIas: boolean; needsVerification: boolean }> = {}
): VerificationState => ({
  ...noFlags,
  isDeviceVerifiedByIas: false,
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
      verified({ isDeactivated: true }),
    ],
    [
      'a credential and the verify flow',
      { hasCredential: true, inVerifyFlow: true },
      verified({ isVerificationInProgress: true }),
    ],
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
