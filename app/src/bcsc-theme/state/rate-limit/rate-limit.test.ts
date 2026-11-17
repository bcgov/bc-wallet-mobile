import { getRateLimitWait, RateLimitWaitType } from './rate-limit'

describe('getRateLimitWait', () => {
  const now = new Date('2026-01-01T00:00:00.000Z')
  const at = (ms: number) => new Date(now.getTime() + ms).toISOString()

  it.each([
    ['missing', undefined],
    ['invalid', 'not-a-date'],
    ['in the past', at(-1000)],
    ['exactly now', at(0)],
  ])('is None when the time is %s', (_label, retryAt) => {
    expect(getRateLimitWait(retryAt, now)).toEqual({ type: RateLimitWaitType.None })
  })

  it.each([
    ['1 second', 1000, 1],
    ['60 seconds', 60_000, 1],
    ['61 seconds', 61_000, 2],
    ['10 minutes', 600_000, 10],
  ])('rounds %s up to %i minute(s)', (_label, ms, minutes) => {
    expect(getRateLimitWait(at(ms), now)).toEqual({
      type: RateLimitWaitType.Waiting,
      retryAt: new Date(at(ms)),
      minutes,
    })
  })
})
