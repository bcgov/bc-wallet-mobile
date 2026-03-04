import { VerificationStatus } from '@/store'
import { isVerificationSuccess } from './bcsc-credential'

describe('isVerificationSuccessful', () => {
  it('should return false when verified is false', async () => {
    const success = isVerificationSuccess({
      verified: false,
    } as any)

    expect(success).toBe(false)
  })

  it('should return false when verified is false and credential is cancelled', async () => {
    const success = isVerificationSuccess({
      verified: false,
      refreshToken: 'mockRefreshToken',
      verifiedStatus: VerificationStatus.REVOKED,
    } as any)

    expect(success).toBe(false)
  })

  it('should return true when verified is true and credential is verified', async () => {
    const success = isVerificationSuccess({
      verified: true,
      refreshToken: 'mockRefreshToken',
      verifiedStatus: VerificationStatus.VERIFIED,
    } as any)

    expect(success).toBe(true)
  })

  it('should return true when verification status is NONE but we have a refresh token', async () => {
    const success = isVerificationSuccess({
      verified: true,
      refreshToken: 'mockRefreshToken',
      verifiedStatus: VerificationStatus.NONE,
    } as any)

    expect(success).toBe(true)
  })
})
