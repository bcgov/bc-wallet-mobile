jest.mock('react-native-bcsc-core', () => ({
  getAllKeys: jest.fn(),
}))

import { KeyRotationSystemCheck } from '@/services/system-checks/KeyRotationSystemCheck'
import { BCDispatchAction } from '@/store'
import { MockLogger } from '@bifold/core'
import { Platform } from 'react-native'
import { getAllKeys } from 'react-native-bcsc-core'

const mockedGetAllKeys = getAllKeys as jest.MockedFunction<typeof getAllKeys>

const makeUtils = () => ({
  dispatch: jest.fn(),
  translation: jest.fn() as any,
  logger: new MockLogger(),
})

const NOW = Date.parse('2026-08-21T00:00:00.000Z')
const originalOS = Platform.OS

describe('KeyRotationSystemCheck', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers().setSystemTime(NOW)
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
    // jest.restoreAllMocks() does not undo Object.defineProperty overrides of Platform.OS.
    Object.defineProperty(Platform, 'OS', { get: () => originalOS })
  })

  describe('runCheck', () => {
    it('passes (skips) when deferForPendingRegistrationUpdate is true', async () => {
      const utils = makeUtils()
      const rotate = jest.fn()
      const check = new KeyRotationSystemCheck(true, undefined, rotate, utils)

      expect(await check.runCheck()).toBe(true)
      expect(mockedGetAllKeys).not.toHaveBeenCalled()
    })

    it('proceeds past the deferral when deferForPendingRegistrationUpdate is false', async () => {
      const utils = makeUtils()
      const rotate = jest.fn()
      mockedGetAllKeys.mockResolvedValue([])
      const check = new KeyRotationSystemCheck(false, undefined, rotate, utils)

      await check.runCheck()

      expect(mockedGetAllKeys).toHaveBeenCalled()
    })

    it('passes (skips) when the last attempt is within the retry backoff window', async () => {
      const utils = makeUtils()
      const rotate = jest.fn()
      // 3 days ago — inside the 7-day backoff.
      const lastAttempt = new Date(NOW - 3 * 24 * 60 * 60 * 1000).toISOString()
      const check = new KeyRotationSystemCheck(false, lastAttempt, rotate, utils)

      expect(await check.runCheck()).toBe(true)
      expect(mockedGetAllKeys).not.toHaveBeenCalled()
    })

    it('proceeds to the age check when the last attempt is older than the backoff window', async () => {
      const utils = makeUtils()
      const rotate = jest.fn()
      // 8 days ago — outside the 7-day backoff.
      const lastAttempt = new Date(NOW - 8 * 24 * 60 * 60 * 1000).toISOString()
      mockedGetAllKeys.mockResolvedValue([])
      const check = new KeyRotationSystemCheck(false, lastAttempt, rotate, utils)

      await check.runCheck()

      expect(mockedGetAllKeys).toHaveBeenCalled()
    })

    it('passes (skips) when getAllKeys throws', async () => {
      const utils = makeUtils()
      const rotate = jest.fn()
      mockedGetAllKeys.mockRejectedValue(new Error('keystore unavailable'))
      const check = new KeyRotationSystemCheck(false, undefined, rotate, utils)

      expect(await check.runCheck()).toBe(true)
    })

    it('passes (skips) when the keystore is empty', async () => {
      const utils = makeUtils()
      const rotate = jest.fn()
      mockedGetAllKeys.mockResolvedValue([])
      const check = new KeyRotationSystemCheck(false, undefined, rotate, utils)

      expect(await check.runCheck()).toBe(true)
    })

    it('passes (skips) when the newest key has no created timestamp', async () => {
      const utils = makeUtils()
      const rotate = jest.fn()
      mockedGetAllKeys.mockResolvedValue([{ id: 'rsa1' } as any])
      const check = new KeyRotationSystemCheck(false, undefined, rotate, utils)

      expect(await check.runCheck()).toBe(true)
    })

    it('passes at 364 days old (iOS, seconds)', async () => {
      Object.defineProperty(Platform, 'OS', { get: () => 'ios' })
      const createdSeconds = (NOW - 364 * 24 * 60 * 60 * 1000) / 1000
      mockedGetAllKeys.mockResolvedValue([{ id: 'rsa1', created: createdSeconds } as any])
      const utils = makeUtils()
      const check = new KeyRotationSystemCheck(false, undefined, jest.fn(), utils)

      expect(await check.runCheck()).toBe(true)
    })

    it('fails at 366 days old (iOS, seconds)', async () => {
      Object.defineProperty(Platform, 'OS', { get: () => 'ios' })
      const createdSeconds = (NOW - 366 * 24 * 60 * 60 * 1000) / 1000
      mockedGetAllKeys.mockResolvedValue([{ id: 'rsa1', created: createdSeconds } as any])
      const utils = makeUtils()
      const check = new KeyRotationSystemCheck(false, undefined, jest.fn(), utils)

      expect(await check.runCheck()).toBe(false)
    })

    it('passes at 364 days old (Android, ms)', async () => {
      Object.defineProperty(Platform, 'OS', { get: () => 'android' })
      const createdMs = NOW - 364 * 24 * 60 * 60 * 1000
      mockedGetAllKeys.mockResolvedValue([{ id: 'rsa1', created: createdMs } as any])
      const utils = makeUtils()
      const check = new KeyRotationSystemCheck(false, undefined, jest.fn(), utils)

      expect(await check.runCheck()).toBe(true)
    })

    it('fails at 366 days old (Android, ms)', async () => {
      Object.defineProperty(Platform, 'OS', { get: () => 'android' })
      const createdMs = NOW - 366 * 24 * 60 * 60 * 1000
      mockedGetAllKeys.mockResolvedValue([{ id: 'rsa1', created: createdMs } as any])
      const utils = makeUtils()
      const check = new KeyRotationSystemCheck(false, undefined, jest.fn(), utils)

      expect(await check.runCheck()).toBe(false)
    })

    it('locks the strict-less-than semantics at the exact 365.0-day boundary (Android, ms)', async () => {
      Object.defineProperty(Platform, 'OS', { get: () => 'android' })
      const createdMs = NOW - 365 * 24 * 60 * 60 * 1000
      mockedGetAllKeys.mockResolvedValue([{ id: 'rsa1', created: createdMs } as any])
      const utils = makeUtils()
      const check = new KeyRotationSystemCheck(false, undefined, jest.fn(), utils)

      expect(await check.runCheck()).toBe(false)
    })

    it('picks the newest key among several when computing age', async () => {
      Object.defineProperty(Platform, 'OS', { get: () => 'android' })
      mockedGetAllKeys.mockResolvedValue([
        { id: 'rsa1', created: NOW - 500 * 24 * 60 * 60 * 1000 } as any, // old, but not newest
        { id: 'rsa2', created: NOW - 10 * 24 * 60 * 60 * 1000 } as any, // newest, well within threshold
      ])
      const utils = makeUtils()
      const check = new KeyRotationSystemCheck(false, undefined, jest.fn(), utils)

      expect(await check.runCheck()).toBe(true)
    })

    it('does not latch rotation off when the last attempt is future-dated', async () => {
      Object.defineProperty(Platform, 'OS', { get: () => 'android' })
      const lastAttempt = new Date(NOW + 3 * 24 * 60 * 60 * 1000).toISOString()
      mockedGetAllKeys.mockResolvedValue([{ id: 'rsa1', created: NOW - 400 * 24 * 60 * 60 * 1000 } as any])
      const utils = makeUtils()
      const check = new KeyRotationSystemCheck(false, lastAttempt, jest.fn(), utils)

      expect(await check.runCheck()).toBe(false)
      expect(mockedGetAllKeys).toHaveBeenCalled()
      expect(utils.logger.warn).toHaveBeenCalled()
    })

    it('ignores a sibling without a created timestamp and rotates on the tracked key', async () => {
      Object.defineProperty(Platform, 'OS', { get: () => 'android' })
      mockedGetAllKeys.mockResolvedValue([
        { id: 'old', created: NOW - 400 * 24 * 60 * 60 * 1000 } as any,
        { id: 'untracked-no-ts' } as any,
      ])
      const utils = makeUtils()
      const check = new KeyRotationSystemCheck(false, undefined, jest.fn(), utils)

      expect(await check.runCheck()).toBe(false)
      expect(utils.logger.warn).toHaveBeenCalledWith(expect.stringContaining("ignoring key 'untracked-no-ts'"))
    })

    it('ignores an Android created: 0 orphan rather than reading it as an epoch-1970 key or blocking rotation', async () => {
      Object.defineProperty(Platform, 'OS', { get: () => 'android' })
      mockedGetAllKeys.mockResolvedValue([
        { id: 'rsa2', created: NOW - 10 * 24 * 60 * 60 * 1000 } as any,
        { id: 'rsa3', created: 0 } as any,
      ])
      const utils = makeUtils()
      const rotate = jest.fn()
      const check = new KeyRotationSystemCheck(false, undefined, rotate, utils)

      expect(await check.runCheck()).toBe(true)
      expect(rotate).not.toHaveBeenCalled()
      expect(utils.logger.warn).toHaveBeenCalledWith(expect.stringContaining("ignoring key 'rsa3'"))
    })

    it('skips when the only key has created: 0', async () => {
      mockedGetAllKeys.mockResolvedValue([{ id: 'rsa1', created: 0 } as any])
      const utils = makeUtils()
      const check = new KeyRotationSystemCheck(false, undefined, jest.fn(), utils)

      expect(await check.runCheck()).toBe(true)
      expect(utils.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('no local key has a usable created timestamp')
      )
    })
  })

  describe('onFail', () => {
    it('dispatches KEY_ROTATION_ATTEMPTED before calling rotate()', async () => {
      const utils = makeUtils()
      const callOrder: string[] = []
      utils.dispatch.mockImplementation(() => callOrder.push('dispatch'))
      const rotate = jest.fn().mockImplementation(async () => {
        callOrder.push('rotate')
        return { status: 'rotated', confirmed: true }
      })
      const check = new KeyRotationSystemCheck(false, undefined, rotate, utils)

      await check.onFail()

      expect(callOrder).toEqual(['dispatch', 'rotate'])
      expect(utils.dispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.KEY_ROTATION_ATTEMPTED,
        payload: [new Date(NOW).toISOString()],
      })
      expect(rotate).toHaveBeenCalled()
    })

    it('swallows a rejecting rotate() without throwing', async () => {
      const utils = makeUtils()
      const rotate = jest.fn().mockRejectedValue(new Error('rotation blew up'))
      const check = new KeyRotationSystemCheck(false, undefined, rotate, utils)

      await expect(check.onFail()).resolves.toBeUndefined()
      expect(utils.logger.error).toHaveBeenCalled()
    })
  })
})
