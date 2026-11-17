import { getPinLockout, PinAttemptFacts, PinLockout, PinLockoutType } from '@/bcsc-theme/state/pin-lockout/pin-lockout'
import { PIN_ATTEMPTS_STORAGE_TIMEOUT_MS } from '@/constants'
import { AppError } from '@/errors/appError'
import { ErrorDefinition, ErrorRegistry } from '@/errors/errorRegistry'
import { BCLocalStorageKeys } from '@/store'
import type { BifoldLogger } from '@bifold/core'
import AsyncStorage from '@react-native-async-storage/async-storage'
// eslint-disable-next-line no-restricted-imports -- the one caller: every PIN check goes through verifyPinWithLockout
import { verifyPIN } from 'react-native-bcsc-core'

const LOG_TAG = '[PinLockout]'

// Saved with the record so its shape can change later; a record with any other version reads as empty
const RECORD_VERSION = 1

export enum PinVerificationType {
  Success = 'success',
  Incorrect = 'incorrect',
  Locked = 'locked',
}

export type PinVerification =
  | { type: PinVerificationType.Success; walletKey?: string }
  // isLastAttempt: one more wrong PIN locks the app
  | { type: PinVerificationType.Incorrect; isLastAttempt: boolean }
  | { type: PinVerificationType.Locked; until: Date }

/**
 * Bounds a storage call. AsyncStorage never settles when its native callback is dropped, and an
 * unsettled call would hold the queue below, and with it every unlock, for the rest of the session.
 */
const withStorageTimeout = async <T>(operation: () => Promise<T>, failure: ErrorDefinition): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race([
      operation(),
      new Promise<never>((_resolve, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error(`PIN attempt storage did not respond within ${PIN_ATTEMPTS_STORAGE_TIMEOUT_MS} ms`)),
          PIN_ATTEMPTS_STORAGE_TIMEOUT_MS
        )
      }),
    ])
  } catch (error) {
    throw AppError.fromErrorDefinition(failure, { cause: error })
  } finally {
    clearTimeout(timeoutId)
  }
}

const toFacts = (raw: string): PinAttemptFacts | undefined => {
  let record: unknown

  try {
    record = JSON.parse(raw)
  } catch {
    return undefined
  }

  if (typeof record !== 'object' || record === null) {
    return undefined
  }

  const { version, failedCount, lastAttemptAt } = record as Record<string, unknown>

  if (version !== RECORD_VERSION) {
    return undefined
  }

  if (typeof failedCount !== 'number' || !Number.isSafeInteger(failedCount) || failedCount < 1) {
    return undefined
  }

  if (typeof lastAttemptAt !== 'number') {
    return undefined
  }

  const lastAttemptDate = new Date(lastAttemptAt)

  if (Number.isNaN(lastAttemptDate.getTime())) {
    return undefined
  }

  return { failedCount, lastAttemptAt: lastAttemptDate }
}

const readFacts = async (logger: BifoldLogger): Promise<PinAttemptFacts | undefined> => {
  const raw = await withStorageTimeout(
    () => AsyncStorage.getItem(BCLocalStorageKeys.PinAttempts),
    ErrorRegistry.STORAGE_READ_ERROR
  )

  if (!raw) {
    return undefined
  }

  const facts = toFacts(raw)

  if (!facts) {
    // A record this build cannot read must not lock the user out for good, so it counts as no attempts
    logger.error(`${LOG_TAG} The stored PIN attempt record is not readable, treating it as empty`)
  }

  return facts
}

const writeFacts = (facts: PinAttemptFacts): Promise<void> => {
  const record = JSON.stringify({
    version: RECORD_VERSION,
    failedCount: facts.failedCount,
    lastAttemptAt: facts.lastAttemptAt.getTime(),
  })

  return withStorageTimeout(
    () => AsyncStorage.setItem(BCLocalStorageKeys.PinAttempts, record),
    ErrorRegistry.STORAGE_WRITE_ERROR
  )
}

const removeFacts = (): Promise<void> =>
  withStorageTimeout(() => AsyncStorage.removeItem(BCLocalStorageKeys.PinAttempts), ErrorRegistry.STORAGE_WRITE_ERROR)

let queue: Promise<unknown> = Promise.resolve()

/**
 * Runs one operation on the record at a time, in call order, so a read never sees a half-finished
 * attempt. Chains onto the tail whether or not the previous operation failed, so one failure cannot
 * hold up the next.
 */
const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
  const result = queue.then(operation, operation)
  queue = result.then(
    () => undefined,
    () => undefined
  )
  return result
}

const restoreFacts = async (facts: PinAttemptFacts | undefined, logger: BifoldLogger): Promise<void> => {
  try {
    await (facts ? writeFacts(facts) : removeFacts())
  } catch (error) {
    logger.error(`${LOG_TAG} Failed to take back an attempt that was never checked`, error as Error)
  }
}

const clearAfterCorrectPin = async (logger: BifoldLogger): Promise<void> => {
  try {
    // Tried twice: the user is in either way, but a count left behind brings the next lock closer
    await removeFacts().catch(removeFacts)
  } catch (error) {
    logger.error(`${LOG_TAG} Failed to clear PIN attempts after a correct PIN`, error as Error)
  }
}

/**
 * Whether PIN entry is open or locked right now. Readable before the app is unlocked.
 *
 * @throws AppError (STORAGE_READ_ERROR) when the record cannot be read; a lock is never assumed away.
 */
export const readPinLockout = (logger: BifoldLogger): Promise<PinLockout> =>
  enqueue(async () => getPinLockout(await readFacts(logger), new Date()))

/**
 * Forgets the recorded attempts: a new PIN or a removed account starts clean. Never throws; a failed
 * clear is logged and leaves the count as it was.
 */
export const clearPinAttempts = (logger: BifoldLogger): Promise<void> =>
  enqueue(async () => {
    try {
      await removeFacts()
    } catch (error) {
      logger.error(`${LOG_TAG} Failed to clear PIN attempts`, error as Error)
    }
  })

/**
 * Checks a PIN under the lockout rules. The only way the app checks a PIN.
 *
 * The attempt is saved before the PIN is checked, so closing the app, a crash, or a failed write can
 * never give a guess that was not counted. A correct PIN clears the count.
 *
 * @throws AppError (STORAGE_READ_ERROR, STORAGE_WRITE_ERROR) when the attempt cannot be recorded; the
 * PIN is then not checked. Rethrows a native rejection after taking the attempt back.
 */
export const verifyPinWithLockout = (pin: string, logger: BifoldLogger): Promise<PinVerification> =>
  enqueue(async () => {
    const previous = await readFacts(logger)
    const attemptedAt = new Date()
    const lockout = getPinLockout(previous, attemptedAt)

    if (lockout.type === PinLockoutType.Locked) {
      return { type: PinVerificationType.Locked, until: lockout.until }
    }

    const attempt: PinAttemptFacts = { failedCount: (previous?.failedCount ?? 0) + 1, lastAttemptAt: attemptedAt }
    await writeFacts(attempt)

    let result: Awaited<ReturnType<typeof verifyPIN>>

    try {
      result = await verifyPIN(pin)
    } catch (error) {
      // The PIN was never judged, so the attempt does not count
      await restoreFacts(previous, logger)
      throw error
    }

    if (result.success) {
      await clearAfterCorrectPin(logger)
      return { type: PinVerificationType.Success, walletKey: result.walletKey }
    }

    const lockoutAfterAttempt = getPinLockout(attempt, new Date())

    if (lockoutAfterAttempt.type === PinLockoutType.Locked) {
      logger.info(`${LOG_TAG} PIN entry locked after ${attempt.failedCount} wrong PINs in a row`)
      return { type: PinVerificationType.Locked, until: lockoutAfterAttempt.until }
    }

    return {
      type: PinVerificationType.Incorrect,
      isLastAttempt: lockoutAfterAttempt.type === PinLockoutType.LastAttempt,
    }
  })
