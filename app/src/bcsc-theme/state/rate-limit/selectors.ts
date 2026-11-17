import { BCState } from '@/store'
import { getRateLimitWait, RateLimitedAction, RateLimitWait } from './rate-limit'

export const selectRateLimitWait = (state: BCState, action: RateLimitedAction, now: Date): RateLimitWait =>
  getRateLimitWait(state.bcsc.rateLimitRetryAt?.[action], now)
