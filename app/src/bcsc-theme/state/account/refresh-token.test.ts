import { isRefreshTokenExpired } from '@/bcsc-theme/state/account/refresh-token'
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
