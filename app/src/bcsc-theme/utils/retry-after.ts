const MAX_DATE_MS = 8.64e15

/**
 * Parses a `Retry-After` header as delay-seconds only; HTTP-dates are deliberately unsupported.
 * Returns null for anything missing, non-positive, malformed or too large to represent as a Date.
 */
export const parseRetryAfter = (value: unknown, now: Date): Date | null => {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) {
    return null
  }

  const seconds = Number(trimmed)
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null
  }

  const retryAtMs = now.getTime() + seconds * 1000
  return Number.isFinite(retryAtMs) && retryAtMs <= MAX_DATE_MS ? new Date(retryAtMs) : null
}
