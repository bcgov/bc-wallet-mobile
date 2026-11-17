import { getPinLockout, PinAttemptFacts, PinLockoutType } from './pin-lockout'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const LAST_ATTEMPT_MS = 1_700_000_000_000

/** A moment `offsetMs` after the latest attempt (before it, when negative) */
const afterLastAttempt = (offsetMs = 0): Date => new Date(LAST_ATTEMPT_MS + offsetMs)

const attempts = (failedCount: number): PinAttemptFacts => ({ failedCount, lastAttemptAt: afterLastAttempt() })

describe('getPinLockout', () => {
  it('is open when no attempts are recorded', () => {
    expect(getPinLockout(undefined, afterLastAttempt())).toEqual({ type: PinLockoutType.Open })
  })

  describe('right after an attempt', () => {
    // Every count up to the 30th wrong PIN, so a change to the schedule cannot slip through
    it.each([
      [0, PinLockoutType.Open, undefined],
      [1, PinLockoutType.Open, undefined],
      [2, PinLockoutType.Open, undefined],
      [3, PinLockoutType.Open, undefined],
      [4, PinLockoutType.LastAttempt, undefined],
      [5, PinLockoutType.Locked, MINUTE],
      [6, PinLockoutType.Open, undefined],
      [7, PinLockoutType.Open, undefined],
      [8, PinLockoutType.Open, undefined],
      [9, PinLockoutType.LastAttempt, undefined],
      [10, PinLockoutType.Locked, 10 * MINUTE],
      [11, PinLockoutType.Open, undefined],
      [12, PinLockoutType.Open, undefined],
      [13, PinLockoutType.Open, undefined],
      [14, PinLockoutType.LastAttempt, undefined],
      [15, PinLockoutType.Locked, HOUR],
      [16, PinLockoutType.Open, undefined],
      [17, PinLockoutType.Open, undefined],
      [18, PinLockoutType.Open, undefined],
      [19, PinLockoutType.LastAttempt, undefined],
      [20, PinLockoutType.Locked, DAY],
      [21, PinLockoutType.Open, undefined],
      [22, PinLockoutType.Open, undefined],
      [23, PinLockoutType.Open, undefined],
      [24, PinLockoutType.LastAttempt, undefined],
      [25, PinLockoutType.Locked, DAY],
      [26, PinLockoutType.Open, undefined],
      [27, PinLockoutType.Open, undefined],
      [28, PinLockoutType.Open, undefined],
      [29, PinLockoutType.LastAttempt, undefined],
      [30, PinLockoutType.Locked, DAY],
    ])('%i wrong PINs in a row is %s', (failedCount, type, lockDuration) => {
      const expected =
        lockDuration === undefined ? { type } : { type: PinLockoutType.Locked, until: afterLastAttempt(lockDuration) }

      expect(getPinLockout(attempts(failedCount), afterLastAttempt())).toEqual(expected)
    })

    it('keeps locking for a day at every 5th wrong PIN past the 30th', () => {
      expect(getPinLockout(attempts(100), afterLastAttempt())).toEqual({
        type: PinLockoutType.Locked,
        until: afterLastAttempt(DAY),
      })
      expect(getPinLockout(attempts(99), afterLastAttempt())).toEqual({ type: PinLockoutType.LastAttempt })
      expect(getPinLockout(attempts(101), afterLastAttempt())).toEqual({ type: PinLockoutType.Open })
    })
  })

  describe('as time passes', () => {
    it('stays locked until the last millisecond of the lock', () => {
      expect(getPinLockout(attempts(5), afterLastAttempt(MINUTE - 1))).toEqual({
        type: PinLockoutType.Locked,
        until: afterLastAttempt(MINUTE),
      })
    })

    it('opens at the moment the lock ends', () => {
      expect(getPinLockout(attempts(5), afterLastAttempt(MINUTE))).toEqual({ type: PinLockoutType.Open })
    })

    it.each([
      [5, MINUTE],
      [10, 10 * MINUTE],
      [15, HOUR],
      [20, DAY],
      [25, DAY],
    ])('opens again once the lock for %i wrong PINs has passed', (failedCount, lockDuration) => {
      expect(getPinLockout(attempts(failedCount), afterLastAttempt(lockDuration))).toEqual({
        type: PinLockoutType.Open,
      })
    })

    it('still warns before the next lock, however long ago the last attempt was', () => {
      expect(getPinLockout(attempts(9), afterLastAttempt(30 * DAY))).toEqual({ type: PinLockoutType.LastAttempt })
    })

    it('stays locked until the same deadline when the clock is behind the last attempt', () => {
      expect(getPinLockout(attempts(5), afterLastAttempt(-HOUR))).toEqual({
        type: PinLockoutType.Locked,
        until: afterLastAttempt(MINUTE),
      })
    })
  })
})
