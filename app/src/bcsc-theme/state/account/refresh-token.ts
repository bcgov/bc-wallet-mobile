import { isTokenExpired } from '@/bcsc-theme/utils/token-expiry'

// No token means session recovery, not renewal.
export const isRefreshTokenExpired = (refreshToken?: string, now: number = Date.now()): boolean =>
  Boolean(refreshToken) && isTokenExpired(refreshToken, now)
