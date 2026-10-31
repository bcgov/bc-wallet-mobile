import { VerificationStatus } from '@/store'
import { getVerificationStatus } from './useVerificationStatus'

describe('getVerificationStatus', () => {
  it.each([
    [
      'verified',
      { verified: true, verifiedStatus: VerificationStatus.VERIFIED },
      { isVerified: true, isVerificationInProgress: false, isDeactivated: false, needsVerification: false },
    ],
    [
      'in progress',
      { verified: false, verifiedStatus: VerificationStatus.IN_PROGRESS },
      { isVerified: false, isVerificationInProgress: true, isDeactivated: false, needsVerification: false },
    ],
    [
      'deactivated',
      { verified: false, verifiedStatus: VerificationStatus.DEACTIVATED },
      { isVerified: false, isVerificationInProgress: false, isDeactivated: true, needsVerification: true },
    ],
    [
      'verified but deactivated (the flag outlives the status)',
      { verified: true, verifiedStatus: VerificationStatus.DEACTIVATED },
      { isVerified: true, isVerificationInProgress: false, isDeactivated: true, needsVerification: false },
    ],
    [
      'unverified',
      { verified: undefined, verifiedStatus: VerificationStatus.UNVERIFIED },
      { isVerified: false, isVerificationInProgress: false, isDeactivated: false, needsVerification: true },
    ],
  ])('is %s', (_name, input, expected) => {
    expect(getVerificationStatus(input)).toEqual(expected)
  })
})
