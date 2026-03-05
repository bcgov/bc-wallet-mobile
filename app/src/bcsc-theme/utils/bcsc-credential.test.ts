import { VerificationStatus } from '@/store'
import { isVerified } from './bcsc-credential'

describe('isVerified', () => {
  it('should return false when verified is false', async () => {
    const success = isVerified({
      verified: false,
    } as any)

    expect(success).toBe(false)
  })

  it('should return false when verified is false and credential is cancelled', async () => {
    const success = isVerified({
      verified: false,
      refreshToken: 'mockRefreshToken',
      verifiedStatus: VerificationStatus.REVOKED,
    } as any)

    expect(success).toBe(false)
  })

  it('should return true when verified is true and credential is verified', async () => {
    const success = isVerified({
      verified: true,
      refreshToken: 'mockRefreshToken',
      verifiedStatus: VerificationStatus.VERIFIED,
    } as any)

    expect(success).toBe(true)
  })

  it('should return true when verification status is NONE but we have a refresh token', async () => {
    const success = isVerified({
      verified: true,
      refreshToken: 'mockRefreshToken',
      verifiedStatus: VerificationStatus.NONE,
    } as any)

    expect(success).toBe(true)
  })
})
