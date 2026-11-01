import { makeJwt } from '@/bcsc-theme/utils/__fixtures__/jwt'
import { isRefreshTokenExpired, isTokenExpired, TOKEN_EXPIRY_BUFFER_MS } from '@/bcsc-theme/utils/token-expiry'

const NOW = 1_700_000_000_000

describe('isTokenExpired', () => {
  it('returns true for an expired exp claim', () => {
    const token = makeJwt({ exp: NOW / 1000 - 3600 })

    expect(isTokenExpired(token, NOW)).toBe(true)
  })

  it('returns false for a future exp claim outside the buffer', () => {
    const token = makeJwt({ exp: NOW / 1000 + 3600 })

    expect(isTokenExpired(token, NOW)).toBe(false)
  })

  it('returns true for an exp claim inside the 30s buffer', () => {
    const token = makeJwt({ exp: NOW / 1000 + TOKEN_EXPIRY_BUFFER_MS / 1000 / 2 })

    expect(isTokenExpired(token, NOW)).toBe(true)
  })

  it('returns true for a decodable token with no exp claim', () => {
    const token = makeJwt({ sub: 'client-1' })

    expect(isTokenExpired(token, NOW)).toBe(true)
  })

  it('returns true when no token is provided', () => {
    expect(isTokenExpired(undefined, NOW)).toBe(true)
  })

  it('returns false and does not throw for a malformed token string', () => {
    expect(() => isTokenExpired('not-a-jwt', NOW)).not.toThrow()
    expect(isTokenExpired('not-a-jwt', NOW)).toBe(false)
  })
})

describe('isRefreshTokenExpired', () => {
  it('returns false when there is no token', () => {
    expect(isRefreshTokenExpired(undefined, NOW)).toBe(false)
  })

  it('returns true for an expired token', () => {
    expect(isRefreshTokenExpired(makeJwt({ exp: NOW / 1000 - 3600 }), NOW)).toBe(true)
  })

  it('returns false for an unexpired token', () => {
    expect(isRefreshTokenExpired(makeJwt({ exp: NOW / 1000 + 3600 }), NOW)).toBe(false)
  })
})
