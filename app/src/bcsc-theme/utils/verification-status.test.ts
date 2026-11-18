import { VerificationRequestStatus } from '@/constants'
import {
  interpretVerificationStatus,
  isDecidedVerificationStatus,
  UNKNOWN_VERIFICATION_STATUS,
} from './verification-status'

describe('interpretVerificationStatus', () => {
  it.each([VerificationRequestStatus.PENDING, VerificationRequestStatus.CANCELLED, VerificationRequestStatus.VERIFIED])(
    'returns %s unchanged',
    (status) => {
      expect(interpretVerificationStatus(status)).toBe(status)
    }
  )

  it.each(['expired', 'rejected', 'VERIFIED', '', 'unknown'])('treats %p as unknown', (status) => {
    expect(interpretVerificationStatus(status)).toBe(UNKNOWN_VERIFICATION_STATUS)
  })

  it.each([null, undefined])('treats %p as unknown', (status) => {
    expect(interpretVerificationStatus(status)).toBe(UNKNOWN_VERIFICATION_STATUS)
  })
})

describe('isDecidedVerificationStatus', () => {
  it.each([
    [VerificationRequestStatus.VERIFIED, true],
    [VerificationRequestStatus.CANCELLED, true],
    [VerificationRequestStatus.PENDING, false],
    [undefined, false],
  ])('reads %p as decided: %s', (status, expected) => {
    expect(isDecidedVerificationStatus(status)).toBe(expected)
  })
})
