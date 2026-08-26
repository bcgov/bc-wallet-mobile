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

describe('KeyRotationSystemCheck', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers().setSystemTime(NOW)
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
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
      const originalOS = Platform.OS
      Object.defineProperty(Platform, 'OS', { get: () => 'ios' })
      const createdSeconds = (NOW - 364 * 24 * 60 * 60 * 1000) / 1000
      mockedGetAllKeys.mockResolvedValue([{ id: 'rsa1', created: createdSeconds } as any])
      const utils = makeUtils()
      const check = new KeyRotationSystemCheck(false, undefined, jest.fn(), utils)

      expect(await check.runCheck()).toBe(true)
      Object.defineProperty(Platform, 'OS', { get: () => originalOS })
    })

    it('fails at 366 days old (iOS, seconds)', async () => {
      const originalOS = Platform.OS
      Object.defineProperty(Platform, 'OS', { get: () => 'ios' })
      const createdSeconds = (NOW - 366 * 24 * 60 * 60 * 1000) / 1000
      mockedGetAllKeys.mockResolvedValue([{ id: 'rsa1', created: createdSeconds } as any])
      const utils = makeUtils()
      const check = new KeyRotationSystemCheck(false, undefined, jest.fn(), utils)

      expect(await check.runCheck()).toBe(false)
      Object.defineProperty(Platform, 'OS', { get: () => originalOS })
    })

    it('passes at 364 days old (Android, ms)', async () => {
      const originalOS = Platform.OS
      Object.defineProperty(Platform, 'OS', { get: () => 'android' })
      const createdMs = NOW - 364 * 24 * 60 * 60 * 1000
      mockedGetAllKeys.mockResolvedValue([{ id: 'rsa1', created: createdMs } as any])
      const utils = makeUtils()
      const check = new KeyRotationSystemCheck(false, undefined, jest.fn(), utils)

      expect(await check.runCheck()).toBe(true)
      Object.defineProperty(Platform, 'OS', { get: () => originalOS })
    })

    it('fails at 366 days old (Android, ms)', async () => {
      const originalOS = Platform.OS
      Object.defineProperty(Platform, 'OS', { get: () => 'android' })
      const createdMs = NOW - 366 * 24 * 60 * 60 * 1000
      mockedGetAllKeys.mockResolvedValue([{ id: 'rsa1', created: createdMs } as any])
      const utils = makeUtils()
      const check = new KeyRotationSystemCheck(false, undefined, jest.fn(), utils)

      expect(await check.runCheck()).toBe(false)
      Object.defineProperty(Platform, 'OS', { get: () => originalOS })
    })

    it('picks the newest key among several when computing age', async () => {
      const originalOS = Platform.OS
      Object.defineProperty(Platform, 'OS', { get: () => 'android' })
      mockedGetAllKeys.mockResolvedValue([
        { id: 'rsa1', created: NOW - 500 * 24 * 60 * 60 * 1000 } as any, // old, but not newest
        { id: 'rsa2', created: NOW - 10 * 24 * 60 * 60 * 1000 } as any, // newest, well within threshold
      ])
      const utils = makeUtils()
      const check = new KeyRotationSystemCheck(false, undefined, jest.fn(), utils)

      expect(await check.runCheck()).toBe(true)
      Object.defineProperty(Platform, 'OS', { get: () => originalOS })
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
