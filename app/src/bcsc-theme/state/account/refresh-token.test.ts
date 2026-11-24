import { getRefreshTokenExpiryBeforeCard, isRefreshTokenExpired } from '@/bcsc-theme/state/account/refresh-token'
import { makeJwt } from '@/bcsc-theme/utils/__fixtures__/jwt'

const NOW = new Date(1_700_000_000_000)

describe('isRefreshTokenExpired', () => {
  it('returns false when there is no token', () => {
    expect(isRefreshTokenExpired(undefined, NOW)).toBe(false)
  })

  it('returns true for an expired token', () => {
    expect(isRefreshTokenExpired(makeJwt({ exp: NOW.getTime() / 1000 - 3600 }), NOW)).toBe(true)
  })

  it('returns false for an unexpired token', () => {
    expect(isRefreshTokenExpired(makeJwt({ exp: NOW.getTime() / 1000 + 3600 }), NOW)).toBe(false)
  })
})

describe('getRefreshTokenExpiryBeforeCard', () => {
  const CARD_EXPIRES_AT = new Date(2026, 10, 24)
  const tokenExpiringAt = (date: Date) => makeJwt({ exp: date.getTime() / 1000 })

  it('returns the token expiry when it falls on a day before the card expiry', () => {
    const tokenExpiresAt = new Date(2026, 10, 23, 23, 59, 59)

    expect(getRefreshTokenExpiryBeforeCard(tokenExpiringAt(tokenExpiresAt), CARD_EXPIRES_AT)).toEqual(tokenExpiresAt)
  })

  it.each([
    ['on the card expiry day', new Date(2026, 10, 24, 0, 0, 1)],
    ['after the card expiry day', new Date(2026, 11, 25)],
  ])('returns undefined when the token expires %s', (_name, tokenExpiresAt) => {
    expect(getRefreshTokenExpiryBeforeCard(tokenExpiringAt(tokenExpiresAt), CARD_EXPIRES_AT)).toBeUndefined()
  })

  it.each([
    ['there is no token', undefined, CARD_EXPIRES_AT],
    ['the token cannot be decoded', 'not-a-jwt', CARD_EXPIRES_AT],
    ['the token has no expiry', makeJwt({}), CARD_EXPIRES_AT],
    ['the card expiry date is invalid', tokenExpiringAt(new Date(2026, 0, 1)), new Date(Number.NaN)],
  ])('returns undefined when %s', (_name, token, cardExpiresAt) => {
    expect(getRefreshTokenExpiryBeforeCard(token, cardExpiresAt)).toBeUndefined()
  })
})
