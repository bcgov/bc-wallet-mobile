import { BCSCAccount } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { BCSCReason } from '@/bcsc-theme/utils/id-token'
import { VerificationRequestStatus } from '@/constants'
import { BCSCSecureState, BCState, initialBCSCSecureState, initialState, VerificationStatus } from '@/store'
import { BCSCCardProcess } from 'react-native-bcsc-core'
import { HomeNotice, HomeNoticeType } from './home-notice'
import { selectHomeNotice } from './selectors'

const NOW = new Date('2026-10-19T12:00:00.000Z')
const IN_8_DAYS = new Date('2026-10-27T00:00:00.000Z')

const buildState = (secure: Partial<BCSCSecureState> = {}, bcscReason?: BCSCReason): BCState => ({
  ...initialState,
  bcsc: { ...initialState.bcsc, credentialMetadata: bcscReason ? { bcscReason } : undefined } as BCState['bcsc'],
  bcscSecure: { ...initialBCSCSecureState, ...secure },
})

const verifiedSecure: Partial<BCSCSecureState> = { verified: true, verifiedStatus: VerificationStatus.VERIFIED }

const buildAccount = (date: Date) => ({ account_expiration_date: date }) as unknown as BCSCAccount

const select = (state: BCState, account: BCSCAccount | null = null): HomeNotice => selectHomeNotice(state, account, NOW)

// An evidence item without `metadata` makes the ID step computation throw
const malformedEvidence = [{ documentNumber: '1' }] as unknown as BCSCSecureState['additionalEvidenceData']

describe('selectHomeNotice', () => {
  it('shows Start on a fresh install', () => {
    expect(select(buildState()).type).toBe(HomeNoticeType.BCSCStartVerification)
  })

  it('shows Pending for a pending request', () => {
    const state = buildState({ verificationRequestStatus: VerificationRequestStatus.PENDING })

    expect(select(state).type).toBe(HomeNoticeType.BCSCPendingReview)
  })

  it('hides Start once a verification request id exists', () => {
    expect(select(buildState({ verificationRequestId: 'req-1' })).type).toBe(HomeNoticeType.None)
  })

  it('shows nothing while the verification is in progress', () => {
    expect(select(buildState({ verifiedStatus: VerificationStatus.IN_PROGRESS })).type).toBe(HomeNoticeType.None)
  })

  it('shows Finish for a device with a refresh token, until that token expires', () => {
    expect(select(buildState({ refreshToken: 'token' })).type).toBe(HomeNoticeType.BCSCVerified)
    expect(select(buildState({ refreshToken: 'token', refreshTokenExpired: true })).type).toBe(
      HomeNoticeType.BCSCStartVerification
    )
  })

  it('shows Continue when the ID step is complete', () => {
    const state = buildState({ cardProcess: BCSCCardProcess.BCSCPhoto, serial: '123456' })

    expect(select(state).type).toBe(HomeNoticeType.BCSCContinueVerification)
  })

  it('does not show Finish for a verified account whose status was deactivated', () => {
    const state = buildState({
      verified: true,
      verifiedStatus: VerificationStatus.DEACTIVATED,
      refreshToken: 'token',
    })

    expect(select(state).type).toBe(HomeNoticeType.None)
  })

  it('shows the renewal notice with the date for a verified card expiring soon', () => {
    expect(select(buildState(verifiedSecure), buildAccount(IN_8_DAYS))).toEqual({
      type: HomeNoticeType.AccountRenewalAvailable,
      expiresAt: IN_8_DAYS,
    })
  })

  it('shows the expired notice when the server expired the card', () => {
    const state = buildState(verifiedSecure, BCSCReason.ExpiredBySystem)

    expect(select(state).type).toBe(HomeNoticeType.AccountExpired)
  })

  describe('malformed retained evidence', () => {
    it('does not throw for a verified user', () => {
      const state = buildState({ ...verifiedSecure, additionalEvidenceData: malformedEvidence })

      expect(select(state, buildAccount(IN_8_DAYS)).type).toBe(HomeNoticeType.AccountRenewalAvailable)
    })

    it.each([
      ['Pending', VerificationRequestStatus.PENDING, HomeNoticeType.BCSCPendingReview],
      ['Cancelled', VerificationRequestStatus.CANCELLED, HomeNoticeType.BCSCCancelledReview],
      ['Finish', VerificationRequestStatus.VERIFIED, HomeNoticeType.BCSCVerified],
    ])('still selects %s', (_name, verificationRequestStatus, expected) => {
      const state = buildState({ verificationRequestStatus, additionalEvidenceData: malformedEvidence })

      expect(select(state).type).toBe(expected)
    })
  })
})
