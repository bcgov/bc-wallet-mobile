import { VerificationRequestStatus } from '@/constants'
import { interpretVerificationStatus, UNKNOWN_VERIFICATION_STATUS } from './verification-status'

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
