import { getVerificationState, VerificationFacts, VerificationState } from './verification-state'

const none: VerificationFacts = {
  hasCredential: false,
  cardInactive: false,
  inVerifyFlow: false,
  hasRefreshToken: false,
}

const verified = (isCardInactive = false): VerificationState => ({
  isCardInactive,
  isVerified: true,
  isDeviceVerifiedByIas: true,
  isVerificationInProgress: false,
  needsVerification: false,
})

type Unverified = Extract<VerificationState, { isVerified: false }>

const unverified = (overrides: Partial<Omit<Unverified, 'isVerified'>> = {}): VerificationState => ({
  isCardInactive: false,
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
      'a credential record and an inactive card (still verified)',
      { hasCredential: true, cardInactive: true },
      verified(true),
    ],
    ['a credential and the verify flow', { hasCredential: true, inVerifyFlow: true }, verified()],
    [
      'tokens without a credential (an account transfer, or a failed finish step)',
      { hasRefreshToken: true },
      unverified({ isDeviceVerifiedByIas: true, needsVerification: true }),
    ],
    [
      'tokens and an inactive card without a credential record (not approved by IAS)',
      { hasRefreshToken: true, cardInactive: true },
      unverified({ isCardInactive: true, needsVerification: true }),
    ],
    [
      'tokens and the verify flow',
      { hasRefreshToken: true, inVerifyFlow: true },
      unverified({ isDeviceVerifiedByIas: true, isVerificationInProgress: true }),
    ],
    ['the verify flow without tokens', { inVerifyFlow: true }, unverified({ isVerificationInProgress: true })],
    [
      'an inactive card without tokens',
      { cardInactive: true },
      unverified({ isCardInactive: true, needsVerification: true }),
    ],
  ])('with %s', (_name, facts, expected) => {
    expect(getVerificationState({ ...none, ...facts })).toEqual(expected)
  })
})
