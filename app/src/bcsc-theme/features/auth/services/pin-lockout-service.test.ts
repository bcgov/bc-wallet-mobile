import { PinLockoutType } from '@/bcsc-theme/state/pin-lockout/pin-lockout'
import { getBCSCState } from '@/bcsc-theme/storage/hooks'
import type { BCSCStore } from '@/bcsc-theme/storage/slices'
import { nativeAccount, seedAccount, seedBCSCStore } from '@/bcsc-theme/storage/testing'
import { AppError } from '@/errors/appError'
import { ErrorRegistry } from '@/errors/errorRegistry'
import type { BifoldLogger } from '@bifold/core'
import { verifyPIN } from 'react-native-bcsc-core'
import { clearPinAttempts, PinVerificationType, readPinLockout, verifyPinWithLockout } from './pin-lockout-service'

type SetPinAttempts = BCSCStore['account']['setPinAttempts']

const mockVerifyPIN = verifyPIN as jest.Mock

const MINUTE = 60_000
const NOW = new Date('2026-11-16T12:00:00.000Z')

const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as BifoldLogger

const storeRecord = (failedCount: number, lastAttemptAt: Date = NOW) => {
  seedBCSCStore({ account: { pinAttempts: { failedCount, lastAttemptAt: lastAttemptAt.getTime() } } })
}

const storedRecord = () => getBCSCState().account.pinAttempts

// Swaps in the given action, by default the real one wrapped so its calls can be asserted
const replaceSetPinAttempts = (
  implementation: SetPinAttempts = getBCSCState().account.setPinAttempts
): jest.Mock<ReturnType<SetPinAttempts>, Parameters<SetPinAttempts>> => {
  const setPinAttempts = jest.fn(implementation)
  seedBCSCStore({ account: { setPinAttempts } })
  return setPinAttempts
}

// The real action, except that the next `times` clears fail
const failClears = (times: number) => {
  const real = getBCSCState().account.setPinAttempts
  let failures = times
  return replaceSetPinAttempts(async (attempts) => {
    if (!attempts && failures > 0) {
      failures--
      throw new Error('remove failed')
    }
    return real(attempts)
  })
}

const wrongPin = () => mockVerifyPIN.mockResolvedValueOnce({ success: false })
const correctPin = () => mockVerifyPIN.mockResolvedValueOnce({ success: true, walletKey: 'wallet-key' })

/** A promise that settles only when the test says so */
const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const expectStorageError = async (operation: Promise<unknown>, definition: { statusCode: number }) => {
  const error = await operation.catch((caught: unknown) => caught)

  expect(error).toBeInstanceOf(AppError)
  expect((error as AppError).statusCode).toBe(definition.statusCode)
}

describe('pin-lockout-service', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(NOW)
    seedAccount(nativeAccount())
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('verifyPinWithLockout', () => {
    it('saves the attempt before the PIN is checked', async () => {
      const setPinAttempts = replaceSetPinAttempts()
      let recordWhenChecked: unknown
      mockVerifyPIN.mockImplementationOnce(async () => {
        recordWhenChecked = storedRecord()
        return { success: false }
      })

      await verifyPinWithLockout('123456', logger)

      expect(recordWhenChecked).toEqual({ failedCount: 1, lastAttemptAt: NOW.getTime() })
      expect(setPinAttempts.mock.invocationCallOrder[0]).toBeLessThan(mockVerifyPIN.mock.invocationCallOrder[0])
    })

    it('passes the PIN to the native check and returns the wallet key for a correct PIN', async () => {
      correctPin()

      const result = await verifyPinWithLockout('123456', logger)

      expect(mockVerifyPIN).toHaveBeenCalledWith(
        { accountId: 'test-account-id', issuer: 'https://idsit.gov.bc.ca/device/' },
        '123456'
      )
      expect(result).toEqual({ type: PinVerificationType.Success, walletKey: 'wallet-key' })
    })

    it('clears the count after a correct PIN', async () => {
      storeRecord(3)
      correctPin()

      await verifyPinWithLockout('123456', logger)

      expect(storedRecord()).toBeUndefined()
    })

    it('starts counting from one again after a correct PIN', async () => {
      storeRecord(3)
      correctPin()
      await verifyPinWithLockout('123456', logger)
      wrongPin()

      await verifyPinWithLockout('000000', logger)

      expect(storedRecord()).toEqual({ failedCount: 1, lastAttemptAt: NOW.getTime() })
    })

    it('counts each wrong PIN and warns when the next one would lock', async () => {
      const results = []

      for (let attempt = 1; attempt <= 4; attempt++) {
        wrongPin()
        results.push(await verifyPinWithLockout('000000', logger))
      }

      expect(results).toEqual([
        { type: PinVerificationType.Incorrect, isLastAttempt: false },
        { type: PinVerificationType.Incorrect, isLastAttempt: false },
        { type: PinVerificationType.Incorrect, isLastAttempt: false },
        { type: PinVerificationType.Incorrect, isLastAttempt: true },
      ])
      expect(storedRecord()).toEqual({ failedCount: 4, lastAttemptAt: NOW.getTime() })
    })

    it('locks on the wrong PIN that reaches the schedule', async () => {
      storeRecord(4)
      wrongPin()

      const result = await verifyPinWithLockout('000000', logger)

      expect(result).toEqual({ type: PinVerificationType.Locked, until: new Date(NOW.getTime() + MINUTE) })
      expect(storedRecord()).toEqual({ failedCount: 5, lastAttemptAt: NOW.getTime() })
    })

    it('refuses a PIN while locked without checking it or counting it', async () => {
      storeRecord(5)
      const setPinAttempts = replaceSetPinAttempts()
      jest.setSystemTime(NOW.getTime() + MINUTE - 1)

      const result = await verifyPinWithLockout('123456', logger)

      expect(result).toEqual({ type: PinVerificationType.Locked, until: new Date(NOW.getTime() + MINUTE) })
      expect(mockVerifyPIN).not.toHaveBeenCalled()
      expect(setPinAttempts).not.toHaveBeenCalled()
      expect(storedRecord()).toEqual({ failedCount: 5, lastAttemptAt: NOW.getTime() })
    })

    it('checks the PIN again once the lock has passed, and carries the count on', async () => {
      storeRecord(5)
      const afterLock = NOW.getTime() + MINUTE
      jest.setSystemTime(afterLock)
      wrongPin()

      const result = await verifyPinWithLockout('000000', logger)

      expect(result).toEqual({ type: PinVerificationType.Incorrect, isLastAttempt: false })
      expect(storedRecord()).toEqual({ failedCount: 6, lastAttemptAt: afterLock })
    })

    it('does not check the PIN when the attempt cannot be saved', async () => {
      replaceSetPinAttempts(jest.fn().mockRejectedValue(new Error('disk full')))

      await expectStorageError(verifyPinWithLockout('123456', logger), ErrorRegistry.STORAGE_WRITE_ERROR)

      expect(mockVerifyPIN).not.toHaveBeenCalled()
    })

    it('does not check the PIN when storage throws instead of rejecting', async () => {
      replaceSetPinAttempts(() => {
        throw new Error('native module missing')
      })

      await expectStorageError(verifyPinWithLockout('123456', logger), ErrorRegistry.STORAGE_WRITE_ERROR)

      expect(mockVerifyPIN).not.toHaveBeenCalled()
    })

    it('takes the attempt back when the native check fails, leaving the earlier count', async () => {
      const earlier = new Date(NOW.getTime() - 10 * MINUTE)
      storeRecord(2, earlier)
      const nativeError = new Error('keystore unavailable')
      mockVerifyPIN.mockRejectedValueOnce(nativeError)

      await expect(verifyPinWithLockout('123456', logger)).rejects.toBe(nativeError)

      expect(storedRecord()).toEqual({ failedCount: 2, lastAttemptAt: earlier.getTime() })
    })

    it('takes the attempt back when the native check fails and there was no earlier count', async () => {
      mockVerifyPIN.mockRejectedValueOnce(new Error('keystore unavailable'))

      await expect(verifyPinWithLockout('123456', logger)).rejects.toThrow('keystore unavailable')

      expect(storedRecord()).toBeUndefined()
    })

    it('still reports the native failure when the attempt cannot be taken back', async () => {
      const nativeError = new Error('keystore unavailable')
      mockVerifyPIN.mockRejectedValueOnce(nativeError)
      failClears(1)

      await expect(verifyPinWithLockout('123456', logger)).rejects.toBe(nativeError)

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('never checked'), expect.any(AppError))
    })

    it('retries the clear once after a correct PIN', async () => {
      storeRecord(3)
      correctPin()
      const setPinAttempts = failClears(1)

      const result = await verifyPinWithLockout('123456', logger)

      expect(result).toEqual({ type: PinVerificationType.Success, walletKey: 'wallet-key' })
      // The attempt, then the clear and its retry
      expect(setPinAttempts).toHaveBeenCalledTimes(3)
      expect(setPinAttempts).toHaveBeenNthCalledWith(2, undefined)
      expect(setPinAttempts).toHaveBeenNthCalledWith(3, undefined)
      expect(storedRecord()).toBeUndefined()
      expect(logger.error).not.toHaveBeenCalled()
    })

    it('lets a correct PIN through even when the count cannot be cleared', async () => {
      storeRecord(3)
      correctPin()
      failClears(2)

      const result = await verifyPinWithLockout('123456', logger)

      expect(result).toEqual({ type: PinVerificationType.Success, walletKey: 'wallet-key' })
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('after a correct PIN'), expect.any(AppError))
    })

    it('checks one PIN at a time, so attempts made together are each counted', async () => {
      const firstCheck = deferred<{ success: boolean }>()
      mockVerifyPIN.mockReturnValueOnce(firstCheck.promise)
      wrongPin()

      const first = verifyPinWithLockout('000000', logger)
      const second = verifyPinWithLockout('111111', logger)
      await jest.advanceTimersByTimeAsync(0)

      // The second attempt waits for the first to finish before it reads the count
      expect(mockVerifyPIN).toHaveBeenCalledTimes(1)
      expect(storedRecord()).toEqual({ failedCount: 1, lastAttemptAt: NOW.getTime() })

      firstCheck.resolve({ success: false })
      await Promise.all([first, second])

      expect(mockVerifyPIN).toHaveBeenCalledTimes(2)
      expect(storedRecord()).toEqual({ failedCount: 2, lastAttemptAt: NOW.getTime() })
    })

    it('keeps working after a storage failure', async () => {
      const real = getBCSCState().account.setPinAttempts
      replaceSetPinAttempts(jest.fn(real).mockRejectedValueOnce(new Error('disk full')))
      await verifyPinWithLockout('123456', logger).catch(() => undefined)
      correctPin()

      const result = await verifyPinWithLockout('123456', logger)

      expect(result).toEqual({ type: PinVerificationType.Success, walletKey: 'wallet-key' })
    })

    it('starts a fresh count when the stored attempt time is out of range', async () => {
      seedBCSCStore({ account: { pinAttempts: { failedCount: 5, lastAttemptAt: 9e15 } } })
      wrongPin()

      const result = await verifyPinWithLockout('000000', logger)

      expect(result).toEqual({ type: PinVerificationType.Incorrect, isLastAttempt: false })
      expect(storedRecord()).toEqual({ failedCount: 1, lastAttemptAt: NOW.getTime() })
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('not readable'))
    })
  })

  describe('readPinLockout', () => {
    it('is open when nothing is recorded', async () => {
      await expect(readPinLockout(logger)).resolves.toEqual({ type: PinLockoutType.Open })
    })

    it('reports a lock with its deadline', async () => {
      storeRecord(10)
      jest.setSystemTime(NOW.getTime() + MINUTE)

      await expect(readPinLockout(logger)).resolves.toEqual({
        type: PinLockoutType.Locked,
        until: new Date(NOW.getTime() + 10 * MINUTE),
      })
    })

    it('is open again once the lock has passed', async () => {
      storeRecord(5)
      jest.setSystemTime(NOW.getTime() + MINUTE)

      await expect(readPinLockout(logger)).resolves.toEqual({ type: PinLockoutType.Open })
    })

    it('does not change the record', async () => {
      storeRecord(5)
      const setPinAttempts = replaceSetPinAttempts()

      await readPinLockout(logger)

      expect(setPinAttempts).not.toHaveBeenCalled()
      expect(storedRecord()).toEqual({ failedCount: 5, lastAttemptAt: NOW.getTime() })
    })

    it('waits for a PIN check in progress, so it sees that attempt', async () => {
      storeRecord(4)
      const check = deferred<{ success: boolean }>()
      mockVerifyPIN.mockReturnValueOnce(check.promise)

      const verification = verifyPinWithLockout('000000', logger)
      const lockout = readPinLockout(logger)
      check.resolve({ success: false })

      await expect(verification).resolves.toMatchObject({ type: PinVerificationType.Locked })
      await expect(lockout).resolves.toMatchObject({ type: PinLockoutType.Locked })
    })
  })

  describe('clearPinAttempts', () => {
    it('removes the record', async () => {
      storeRecord(5)

      await clearPinAttempts(logger)

      expect(storedRecord()).toBeUndefined()
      await expect(readPinLockout(logger)).resolves.toEqual({ type: PinLockoutType.Open })
    })

    it('logs and resolves when the record cannot be removed', async () => {
      storeRecord(5)
      failClears(1)

      await expect(clearPinAttempts(logger)).resolves.toBeUndefined()

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to clear'), expect.any(AppError))
      expect(storedRecord()).toEqual({ failedCount: 5, lastAttemptAt: NOW.getTime() })
    })
  })
})
