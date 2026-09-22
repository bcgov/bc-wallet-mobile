import { isTokenExpired, TOKEN_EXPIRY_BUFFER_MS } from './token-expiry'

const base64url = (input: string): string =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const makeJwt = (payload: Record<string, unknown>): string => {
  const header = base64url(JSON.stringify({ alg: 'none', typ: 'JWT' }))
  const body = base64url(JSON.stringify(payload))
  return `${header}.${body}.signature`
}

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
