import { jwtDecode } from 'jwt-decode'

// Refresh tokens 30 seconds before they actually expire to avoid
// expiry-on-the-wire races when multiple requests fire near the boundary.
export const TOKEN_EXPIRY_BUFFER_MS = 30 * 1000

/**
 * Whether a JWT's `exp` is past (or inside the buffer). Never throws: missing token or `exp` → true;
 * undecodable → false, so a malformed stored value is left to the server rather than faking expiry.
 *
 * @param token The JWT to check
 * @param now Current time in ms, injectable for testing
 */
export const isTokenExpired = (token?: string, now: number = Date.now()): boolean => {
  if (!token) {
    return true
  }

  try {
    const exp = jwtDecode(token).exp ?? 0
    return now >= exp * 1000 - TOKEN_EXPIRY_BUFFER_MS
  } catch {
    return false
  }
}
