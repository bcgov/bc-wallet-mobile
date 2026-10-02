import { isAxiosAppError } from '@/errors/appError'

export const CALL_VOLUME_REACHED_STATUS = 553

export interface VideoServiceUnavailability {
  // true: all agents are busy, false: the service is closed
  busy: boolean
}

const hasRetryAfter = (retryAfter: unknown): boolean => {
  if (typeof retryAfter !== 'string' || retryAfter.trim() === '') {
    return false
  }

  // Retry-After is either delay-seconds or an HTTP-date
  if (/^\d+$/.test(retryAfter.trim())) {
    return Number(retryAfter) > 0
  }

  return !Number.isNaN(Date.parse(retryAfter))
}

/**
 * Maps a create-session failure to the busy/closed state the user should see (v3 parity):
 * - 553: call volume reached, all agents busy
 * - 503 with Retry-After: service closed until the given time
 * - 503 without Retry-After: all agents busy
 */
export const getVideoServiceUnavailability = (error: unknown): VideoServiceUnavailability | null => {
  if (isAxiosAppError(error, CALL_VOLUME_REACHED_STATUS)) {
    return { busy: true }
  }

  if (isAxiosAppError(error, 503)) {
    return { busy: !hasRetryAfter(error.cause.response?.headers?.['retry-after']) }
  }

  return null
}
