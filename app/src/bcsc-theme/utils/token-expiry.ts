import { jwtDecode } from 'jwt-decode'

// Refresh tokens 30 seconds before they actually expire to avoid
// expiry-on-the-wire races when multiple requests fire near the boundary.
export const TOKEN_EXPIRY_BUFFER_MS = 30 * 1000

/**
 * Whether a JWT is expired (or within the expiry buffer), decoding its `exp` claim locally.
 *
 * No token, or a decodable token with no `exp` claim, is treated as expired (matches the client's
 * historical behaviour). A token that can't be decoded at all returns `false` so a malformed stored
 * value is left to the server to reject, rather than short-circuiting a caller into treating it as an
 * expired-credential state — never throws.
 *
 * @param token The JWT to check
 * @param now Current time in ms, injectable for testing
 */
export const isTokenExpired = (token?: string, now: number = Date.now()): boolean => {
  if (!token) {
    return true
  }

  try {
    const decoded = jwtDecode(token)
    const exp = decoded.exp ?? 0
    // No `exp` claim (exp === 0) always satisfies `now >= 0 - buffer` below, so it naturally
    // resolves to expired without a separate branch.
    return now >= exp * 1000 - TOKEN_EXPIRY_BUFFER_MS
  } catch {
    return false
  }
}
