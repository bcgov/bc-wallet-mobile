import { getPinLockout, PinAttemptFacts, PinLockout, PinLockoutType } from '@/bcsc-theme/state/pin-lockout/pin-lockout'
import { getBCSCState, requirePINAccount } from '@/bcsc-theme/storage/hooks'
import { AppError } from '@/errors/appError'
import { ErrorDefinition, ErrorRegistry } from '@/errors/errorRegistry'
import type { BifoldLogger } from '@bifold/core'
// eslint-disable-next-line no-restricted-imports -- the one caller: every PIN check goes through verifyPinWithLockout
import { verifyPIN } from 'react-native-bcsc-core'

const LOG_TAG = '[PinLockout]'

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

// Storage failures surface as these errors, as the AsyncStorage record's did
const mapFailure = async <T>(operation: () => Promise<T>, failure: ErrorDefinition): Promise<T> => {
  try {
    return await operation()
  } catch (error) {
    throw AppError.fromErrorDefinition(failure, { cause: error })
  }
}

// The record lives in account/pinAttempts (m0001 copied the AsyncStorage one there)
const readFacts = async (logger: BifoldLogger): Promise<PinAttemptFacts | undefined> => {
  const record = await mapFailure(
    () => Promise.resolve(getBCSCState().account.pinAttempts),
    ErrorRegistry.STORAGE_READ_ERROR
  )

  if (!record || record.failedCount < 1) {
    return undefined
  }

  const lastAttemptAt = new Date(record.lastAttemptAt)

  if (Number.isNaN(lastAttemptAt.getTime())) {
    // A record this build cannot read must not lock the user out for good, so it counts as no attempts
    logger.error(`${LOG_TAG} The stored PIN attempt record is not readable, treating it as empty`)
    return undefined
  }

  return { failedCount: record.failedCount, lastAttemptAt }
}

const writeFacts = (facts: PinAttemptFacts): Promise<void> =>
  mapFailure(
    () =>
      getBCSCState().account.setPinAttempts({
        failedCount: facts.failedCount,
        lastAttemptAt: facts.lastAttemptAt.getTime(),
      }),
    ErrorRegistry.STORAGE_WRITE_ERROR
  )

const removeFacts = (): Promise<void> =>
  mapFailure(() => getBCSCState().account.setPinAttempts(undefined), ErrorRegistry.STORAGE_WRITE_ERROR)

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
      result = await verifyPIN(requirePINAccount(), pin)
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
