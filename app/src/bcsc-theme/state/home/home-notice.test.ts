import { VerificationRequestStatus } from '@/constants'
import { AccountPhaseType } from '../account/account-phase'
import { getHomeNotice, HomeNoticeFacts, HomeNoticeType } from './home-notice'

const EXPIRES_AT = new Date('2026-10-22T00:00:00.000Z')

const facts = (overrides: Partial<HomeNoticeFacts> = {}): HomeNoticeFacts => ({
  isVerified: true,
  needsVerification: false,
  cardInactive: false,
  deviceVerifiedByIas: false,
  refreshTokenExpired: false,
  requestStatus: undefined,
  hasVerificationRequest: false,
  isIdStepCompleted: () => false,
  accountPhase: { phase: AccountPhaseType.Active, expiresAt: EXPIRES_AT },
  ...overrides,
})

const unverified = (overrides: Partial<HomeNoticeFacts> = {}) =>
  facts({ isVerified: false, needsVerification: true, accountPhase: { phase: AccountPhaseType.None }, ...overrides })

describe('getHomeNotice', () => {
  it.each<[string, HomeNoticeFacts, HomeNoticeType]>([
    ['a fresh install', unverified(), HomeNoticeType.BCSCStartVerification],
    [
      'setup resumable with the ID step done',
      unverified({ isIdStepCompleted: () => true }),
      HomeNoticeType.BCSCContinueVerification,
    ],
    [
      'a pending review',
      unverified({ requestStatus: VerificationRequestStatus.PENDING }),
      HomeNoticeType.BCSCPendingReview,
    ],
    [
      'a cancelled review',
      unverified({ requestStatus: VerificationRequestStatus.CANCELLED }),
      HomeNoticeType.BCSCCancelledReview,
    ],
    [
      'a reviewed request (VERIFIED status)',
      unverified({ requestStatus: VerificationRequestStatus.VERIFIED }),
      HomeNoticeType.BCSCVerified,
    ],
    ['a device IAS has verified', unverified({ deviceVerifiedByIas: true }), HomeNoticeType.BCSCVerified],
    [
      'an expired card',
      facts({ accountPhase: { phase: AccountPhaseType.Expired, expiresAt: EXPIRES_AT } }),
      HomeNoticeType.AccountExpired,
    ],
    [
      'an expired card with no known date',
      facts({ accountPhase: { phase: AccountPhaseType.Expired } }),
      HomeNoticeType.AccountExpired,
    ],
    ['an active card', facts(), HomeNoticeType.None],
    ['an unknown card phase', facts({ accountPhase: { phase: AccountPhaseType.Unknown } }), HomeNoticeType.None],
    ['no card to judge', facts({ accountPhase: { phase: AccountPhaseType.None } }), HomeNoticeType.None],
  ])('shows the right notice for %s', (_name, input, expected) => {
    expect(getHomeNotice(input).type).toBe(expected)
  })

  it('carries the expiry date on the renewal notice', () => {
    expect(
      getHomeNotice(facts({ accountPhase: { phase: AccountPhaseType.ExpiringSoon, expiresAt: EXPIRES_AT } }))
    ).toEqual({
      type: HomeNoticeType.AccountRenewalAvailable,
      expiresAt: EXPIRES_AT,
    })
  })

  describe('precedence', () => {
    const expiringSoon = { phase: AccountPhaseType.ExpiringSoon, expiresAt: EXPIRES_AT } as const

    it.each<[string, HomeNoticeFacts, HomeNoticeType]>([
      [
        'Finish beats Cancelled',
        unverified({ requestStatus: VerificationRequestStatus.CANCELLED, deviceVerifiedByIas: true }),
        HomeNoticeType.BCSCVerified,
      ],
      [
        'Finish beats Pending',
        unverified({ requestStatus: VerificationRequestStatus.PENDING, deviceVerifiedByIas: true }),
        HomeNoticeType.BCSCVerified,
      ],
      [
        'Finish beats Continue and Start',
        unverified({ deviceVerifiedByIas: true, isIdStepCompleted: () => true }),
        HomeNoticeType.BCSCVerified,
      ],
      [
        'Finish beats the renewal notice',
        unverified({ deviceVerifiedByIas: true, accountPhase: expiringSoon }),
        HomeNoticeType.BCSCVerified,
      ],
      [
        'an expired refresh token blocks Finish from a device IAS verified (back to Start)',
        unverified({ deviceVerifiedByIas: true, refreshTokenExpired: true }),
        HomeNoticeType.BCSCStartVerification,
      ],
      [
        'an expired refresh token does not block Finish from a VERIFIED status',
        unverified({ requestStatus: VerificationRequestStatus.VERIFIED, refreshTokenExpired: true }),
        HomeNoticeType.BCSCVerified,
      ],
      [
        'a verified user has no Finish from a stale VERIFIED status (falls to the card)',
        facts({
          requestStatus: VerificationRequestStatus.VERIFIED,
          accountPhase: { phase: AccountPhaseType.Expired, expiresAt: EXPIRES_AT },
        }),
        HomeNoticeType.AccountExpired,
      ],
      [
        'a verified user has no Finish from tokens IAS issued',
        facts({ deviceVerifiedByIas: true }),
        HomeNoticeType.None,
      ],
      [
        'Continue beats Start',
        unverified({ isIdStepCompleted: () => true, hasVerificationRequest: false }),
        HomeNoticeType.BCSCContinueVerification,
      ],
      ['a verification request hides Start', unverified({ hasVerificationRequest: true }), HomeNoticeType.None],
      [
        'a verification in progress shows nothing',
        facts({ isVerified: false, needsVerification: false, accountPhase: { phase: AccountPhaseType.None } }),
        HomeNoticeType.None,
      ],
      [
        'Pending beats Continue',
        unverified({ requestStatus: VerificationRequestStatus.PENDING, isIdStepCompleted: () => true }),
        HomeNoticeType.BCSCPendingReview,
      ],
      [
        'needing verification beats the renewal notice',
        unverified({ accountPhase: expiringSoon }),
        HomeNoticeType.BCSCStartVerification,
      ],
      [
        'Cancelled beats Expired for a verified user',
        facts({
          requestStatus: VerificationRequestStatus.CANCELLED,
          accountPhase: { phase: AccountPhaseType.Expired, expiresAt: EXPIRES_AT },
        }),
        HomeNoticeType.BCSCCancelledReview,
      ],
    ])('%s', (_name, input, expected) => {
      expect(getHomeNotice(input).type).toBe(expected)
    })
  })

  // An inactive, unfinished device never gets Finish; the rows fall through to the usual order.
  // "An approved request, ID step incomplete" loses its Finish and shows nothing; the flow is not known to produce it.
  describe('an unverified device with an inactive card', () => {
    const inactive = (overrides: Partial<HomeNoticeFacts> = {}) =>
      unverified({ cardInactive: true, deviceVerifiedByIas: false, ...overrides })

    it.each<[string, HomeNoticeFacts, HomeNoticeType]>([
      [
        'a cancelled review',
        inactive({ requestStatus: VerificationRequestStatus.CANCELLED }),
        HomeNoticeType.BCSCCancelledReview,
      ],
      [
        'a pending review',
        inactive({ requestStatus: VerificationRequestStatus.PENDING }),
        HomeNoticeType.BCSCPendingReview,
      ],
      [
        'no request, ID step complete',
        inactive({ isIdStepCompleted: () => true }),
        HomeNoticeType.BCSCContinueVerification,
      ],
      ['no request, ID step incomplete', inactive(), HomeNoticeType.BCSCStartVerification],
      [
        'a request ID and the ID step complete',
        inactive({ hasVerificationRequest: true, isIdStepCompleted: () => true }),
        HomeNoticeType.BCSCContinueVerification,
      ],
      ['a request ID and the ID step incomplete', inactive({ hasVerificationRequest: true }), HomeNoticeType.None],
      [
        'an approved request, ID step complete',
        inactive({
          requestStatus: VerificationRequestStatus.VERIFIED,
          hasVerificationRequest: true,
          isIdStepCompleted: () => true,
        }),
        HomeNoticeType.BCSCContinueVerification,
      ],
      [
        'an approved request, ID step incomplete',
        inactive({ requestStatus: VerificationRequestStatus.VERIFIED, hasVerificationRequest: true }),
        HomeNoticeType.None,
      ],
      [
        'tokens IAS issued',
        inactive({ deviceVerifiedByIas: true, hasVerificationRequest: false }),
        HomeNoticeType.BCSCStartVerification,
      ],
    ])('with %s', (_name, input, expected) => {
      expect(getHomeNotice(input).type).toBe(expected)
    })
  })

  describe('the lazy ID step fact', () => {
    it.each<[string, Partial<HomeNoticeFacts>]>([
      ['Finish matches', { requestStatus: VerificationRequestStatus.VERIFIED }],
      ['Cancelled matches', { requestStatus: VerificationRequestStatus.CANCELLED }],
      ['Pending matches', { requestStatus: VerificationRequestStatus.PENDING }],
      ['verification is not needed', { isVerified: true, needsVerification: false }],
    ])('is not read when %s', (_name, overrides) => {
      const isIdStepCompleted = jest.fn(() => true)

      getHomeNotice(unverified({ ...overrides, isIdStepCompleted }))

      expect(isIdStepCompleted).not.toHaveBeenCalled()
    })

    it('is read when nothing earlier matched', () => {
      const isIdStepCompleted = jest.fn(() => false)

      getHomeNotice(unverified({ isIdStepCompleted }))

      expect(isIdStepCompleted).toHaveBeenCalledTimes(1)
    })
  })
})
