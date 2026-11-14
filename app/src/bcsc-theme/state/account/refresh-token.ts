import { isTokenExpired } from '@/bcsc-theme/utils/token-expiry'

// Unlike isTokenExpired, a missing token returns false: with no session there is nothing to renew,
// so the expired-login flow must not fire. Recovery and onboarding handle that case.
export const isRefreshTokenExpired = (refreshToken: string | undefined, now: Date): boolean =>
  Boolean(refreshToken) && isTokenExpired(refreshToken, now.getTime())
