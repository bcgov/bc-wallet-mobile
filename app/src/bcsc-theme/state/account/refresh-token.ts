import { isTokenExpired } from '@/bcsc-theme/utils/token-expiry'
import { jwtDecode } from 'jwt-decode'
import moment from 'moment'

// Unlike isTokenExpired, a missing token returns false: with no session there is nothing to renew,
// so the expired-login flow must not fire. Recovery and onboarding handle that case.
export const isRefreshTokenExpired = (refreshToken: string | undefined, now: Date): boolean =>
  Boolean(refreshToken) && isTokenExpired(refreshToken, now.getTime())

/**
 * The refresh token's expiry, when it falls on an earlier calendar day than the card expiry date: sign-in
 * stops working while the account still shows active. IAS sets both from the same lifetime, with the token
 * issued later, so a token that outlives the card date is expected and returns undefined.
 */
export const getRefreshTokenExpiryBeforeCard = (
  refreshToken: string | undefined,
  cardExpiresAt: Date
): Date | undefined => {
  if (!refreshToken || Number.isNaN(cardExpiresAt.getTime())) {
    return undefined
  }

  let exp: number | undefined
  try {
    exp = jwtDecode(refreshToken).exp
  } catch {
    return undefined
  }

  if (!exp) {
    return undefined
  }

  const tokenExpiresAt = new Date(exp * 1000)
  return moment(tokenExpiresAt).isBefore(cardExpiresAt, 'day') ? tokenExpiresAt : undefined
}
