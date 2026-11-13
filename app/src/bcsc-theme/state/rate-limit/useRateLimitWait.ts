import { BCState } from '@/store'
import { useStore } from '@bifold/core'
import { useEffect, useMemo, useState } from 'react'
import { AppState } from 'react-native'
import { RateLimitedAction, RateLimitWait, RateLimitWaitType } from './rate-limit'
import { selectRateLimitWait } from './selectors'

const REFRESH_INTERVAL_MS = 60 * 1000

/**
 * The wait for an action, for display. While waiting it re-derives once a minute, at the retry time
 * and on app foreground; unlike the card expiry phase, this wait is meant to end while a screen is open.
 */
export const useRateLimitWait = (action: RateLimitedAction): RateLimitWait => {
  const [store] = useStore<BCState>()
  const [now, setNow] = useState(() => new Date())
  const retryAt = store.bcsc.rateLimitRetryAt?.[action]

  const wait = useMemo(() => selectRateLimitWait(store, action, now), [store, action, now])
  const retryAtMs = wait.type === RateLimitWaitType.Waiting ? wait.retryAt.getTime() : undefined

  // Resync with the clock whenever the stored time changes, since `now` may predate the new value
  useEffect(() => {
    setNow(new Date())
  }, [retryAt])

  useEffect(() => {
    if (retryAtMs === undefined) {
      return
    }

    const timeout = setTimeout(() => setNow(new Date()), Math.min(REFRESH_INTERVAL_MS, retryAtMs - now.getTime()))
    return () => clearTimeout(timeout)
  }, [retryAtMs, now])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setNow(new Date())
      }
    })
    return () => subscription.remove()
  }, [])

  return wait
}
