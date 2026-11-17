const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

/** How long the app locks once this many wrong PINs have been entered in a row. */
const LOCK_BY_FAILED_COUNT: Readonly<Partial<Record<number, number>>> = {
  5: MINUTE_MS,
  10: 10 * MINUTE_MS,
  15: HOUR_MS,
}

// From the 20th wrong PIN on, every 5th one locks for a day
const REPEATING_LOCK_FROM = 20
const REPEATING_LOCK_EVERY = 5
const REPEATING_LOCK_MS = DAY_MS

export interface PinAttemptFacts {
  /** PIN attempts in a row that were not followed by a correct PIN */
  failedCount: number
  /** When the latest of those attempts was made */
  lastAttemptAt: Date
}

export enum PinLockoutType {
  /** PIN entry is allowed */
  Open = 'open',
  /** PIN entry is allowed, but one more wrong PIN locks the app */
  LastAttempt = 'lastAttempt',
  /** PIN entry is refused until `until` */
  Locked = 'locked',
}

export type PinLockout =
  | { type: PinLockoutType.Open }
  | { type: PinLockoutType.LastAttempt }
  | { type: PinLockoutType.Locked; until: Date }

const getLockDuration = (failedCount: number): number | undefined => {
  const scheduled = LOCK_BY_FAILED_COUNT[failedCount]

  if (scheduled !== undefined) {
    return scheduled
  }

  if (failedCount >= REPEATING_LOCK_FROM && failedCount % REPEATING_LOCK_EVERY === 0) {
    return REPEATING_LOCK_MS
  }

  return undefined
}

/**
 * The single definition of the PIN lockout schedule, for both platforms and every screen that asks
 * for the PIN. A lock runs from the latest attempt, by the device clock and to the millisecond; once
 * it has passed, PIN entry opens again and the count carries on towards the next, longer lock.
 *
 * No facts means no wrong PIN is on record, which is open. A record that could not be read is not
 * "no facts": the reader fails instead, so a lock is never assumed away.
 */
export const getPinLockout = (facts: PinAttemptFacts | undefined, now: Date): PinLockout => {
  if (!facts) {
    return { type: PinLockoutType.Open }
  }

  const lockDuration = getLockDuration(facts.failedCount)

  if (lockDuration !== undefined) {
    const until = new Date(facts.lastAttemptAt.getTime() + lockDuration)

    if (now.getTime() < until.getTime()) {
      return { type: PinLockoutType.Locked, until }
    }
  }

  if (getLockDuration(facts.failedCount + 1) !== undefined) {
    return { type: PinLockoutType.LastAttempt }
  }

  return { type: PinLockoutType.Open }
}
