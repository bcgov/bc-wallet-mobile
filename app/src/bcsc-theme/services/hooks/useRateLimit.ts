import { RateLimitedAction, RateLimitWait } from '@/bcsc-theme/state/rate-limit/rate-limit'
import { selectRateLimitWait } from '@/bcsc-theme/state/rate-limit/selectors'
import { parseRetryAfter } from '@/bcsc-theme/utils/retry-after'
import { isAxiosAppError } from '@/errors/appError'
import { BCDispatchAction, BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useCallback, useMemo, useRef } from 'react'

// The status each action's rate-limit response carries
const RATE_LIMIT_STATUS: Record<RateLimitedAction, number> = {
  [RateLimitedAction.CardAdd]: 503,
  [RateLimitedAction.QRTransfer]: 429,
  [RateLimitedAction.Email]: 429,
}

/**
 * Guards and records server rate limits. `recordRateLimit` is the only writer of `rateLimitRetryAt`.
 * Both functions stay stable across store updates so they are safe in service hook dependencies.
 */
export const useRateLimit = () => {
  const [store, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const storeRef = useRef(store)
  storeRef.current = store

  /** Reads with the clock at call time; use immediately before a request. */
  const getWait = useCallback(
    (action: RateLimitedAction): RateLimitWait => selectRateLimitWait(storeRef.current, action, new Date()),
    []
  )

  /** Stores the retry time when `error` is this action's rate-limit response with a usable Retry-After. Never throws. */
  const recordRateLimit = useCallback(
    (action: RateLimitedAction, error: unknown) => {
      if (!isAxiosAppError(error, RATE_LIMIT_STATUS[action])) {
        return
      }

      const retryAt = parseRetryAfter(error.cause.response?.headers?.['retry-after'], new Date())
      if (!retryAt) {
        // Action and status only: the request behind this error carries personal data
        logger.warn(`[RateLimit] ${action} limited without a usable Retry-After, not pausing`)
        return
      }

      dispatch({
        type: BCDispatchAction.RATE_LIMIT_RECEIVED,
        payload: [{ action, retryAt: retryAt.toISOString() }],
      })
    },
    [dispatch, logger]
  )

  return useMemo(() => ({ getWait, recordRateLimit }), [getWait, recordRateLimit])
}
