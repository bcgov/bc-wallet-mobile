import { BCState, initialState } from '@/store'
import { RateLimitedAction, RateLimitWaitType } from './rate-limit'
import { selectRateLimitWait } from './selectors'

const now = new Date('2026-01-01T00:00:00.000Z')

const stateWith = (rateLimitRetryAt?: BCState['bcsc']['rateLimitRetryAt']): BCState => ({
  ...initialState,
  bcsc: { ...initialState.bcsc, rateLimitRetryAt },
})

describe('selectRateLimitWait', () => {
  it('reads the requested action only', () => {
    const state = stateWith({ [RateLimitedAction.QRTransfer]: '2026-01-01T00:05:00.000Z' })

    expect(selectRateLimitWait(state, RateLimitedAction.QRTransfer, now)).toMatchObject({
      type: RateLimitWaitType.Waiting,
      minutes: 5,
    })
    expect(selectRateLimitWait(state, RateLimitedAction.CardAdd, now)).toEqual({ type: RateLimitWaitType.None })
  })

  it('is None when nothing was ever recorded', () => {
    expect(selectRateLimitWait(stateWith(), RateLimitedAction.CardAdd, now)).toEqual({ type: RateLimitWaitType.None })
  })

  it('turns None once only the clock has advanced', () => {
    const state = stateWith({ [RateLimitedAction.CardAdd]: '2026-01-01T00:10:00.000Z' })

    expect(selectRateLimitWait(state, RateLimitedAction.CardAdd, new Date('2026-01-01T00:10:00.000Z'))).toEqual({
      type: RateLimitWaitType.None,
    })
  })
})
