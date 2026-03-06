import { VerificationStatus } from '@/store'
import { isUserVerified } from './bcsc-credential'

describe('isUserVerified', () => {
  it('should return false when verified is false', async () => {
    const success = isUserVerified({
      verified: false,
    } as any)

    expect(success).toBe(false)
  })

  it('should return false when verified is false and credential is cancelled', async () => {
    const success = isUserVerified({
      verified: false,
      refreshToken: 'mockRefreshToken',
      verifiedStatus: VerificationStatus.DEACTIVATED,
    } as any)

    expect(success).toBe(false)
  })

  it('should return true when verified is true and credential is verified', async () => {
    const success = isUserVerified({
      verified: true,
      refreshToken: 'mockRefreshToken',
      verifiedStatus: VerificationStatus.VERIFIED,
    } as any)

    expect(success).toBe(true)
  })

  it('should return true when verification status is UNVERIFIED but we have a refresh token', async () => {
    const success = isUserVerified({
      verified: true,
      refreshToken: 'mockRefreshToken',
      verifiedStatus: VerificationStatus.UNVERIFIED,
    } as any)

    expect(success).toBe(true)
  })
})
