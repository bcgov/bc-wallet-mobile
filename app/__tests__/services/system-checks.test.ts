import { BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import {
  DeviceCountSystemCheck,
  runSystemChecks,
  ServerStatusSystemCheck,
  SystemCheckStrategy,
} from '@/services/system-checks'
import { BCDispatchAction } from '@/store'

describe('System Checks', () => {
  describe('runSystemChecks', () => {
    it('should run all checks and return statuses', async () => {
      const mockSystemCheck: SystemCheckStrategy = {
        runCheck: jest.fn().mockResolvedValue(true),
        onFail: jest.fn(),
        onSuccess: jest.fn(),
      }

      const results = await runSystemChecks([mockSystemCheck, mockSystemCheck])

      expect(results).toHaveLength(2)
      expect(results).toEqual([true, true])
    })

    it('should call onFail for failed checks and onSuccess for passed checks', async () => {
      const mockOnFail = jest.fn()
      const mockOnSuccess = jest.fn()

      const passingCheck: SystemCheckStrategy = {
        runCheck: jest.fn().mockResolvedValue(true),
        onFail: mockOnFail,
        onSuccess: mockOnSuccess,
      }

      const failingCheck: SystemCheckStrategy = {
        runCheck: jest.fn().mockResolvedValue(false),
        onFail: mockOnFail,
        onSuccess: mockOnSuccess,
      }

      const results = await runSystemChecks([passingCheck, failingCheck])

      expect(results).toEqual([true, false])
      expect(mockOnSuccess).toHaveBeenCalledTimes(1)
      expect(mockOnFail).toHaveBeenCalledTimes(1)
    })

    it('should handle an empty array of checks', async () => {
      const results = await runSystemChecks([])

      expect(results).toEqual([])
    })

    it('should handle all checks failing', async () => {
      const mockOnFail = jest.fn()

      const failingCheck1: SystemCheckStrategy = {
        runCheck: jest.fn().mockResolvedValue(false),
        onFail: mockOnFail,
      }

      const failingCheck2: SystemCheckStrategy = {
        runCheck: jest.fn().mockResolvedValue(false),
        onFail: mockOnFail,
      }

      const results = await runSystemChecks([failingCheck1, failingCheck2])

      expect(results).toEqual([false, false])
      expect(mockOnFail).toHaveBeenCalledTimes(2)
    })

    it('should handle all checks passing', async () => {
      const mockOnSuccess = jest.fn()

      const passingCheck1: SystemCheckStrategy = {
        runCheck: jest.fn().mockResolvedValue(true),
        onFail: jest.fn(),
        onSuccess: mockOnSuccess,
      }

      const passingCheck2: SystemCheckStrategy = {
        runCheck: jest.fn().mockResolvedValue(true),
        onFail: jest.fn(),
        onSuccess: mockOnSuccess,
      }

      const results = await runSystemChecks([passingCheck1, passingCheck2])

      expect(results).toEqual([true, true])
      expect(mockOnSuccess).toHaveBeenCalledTimes(2)
    })
  })

  describe('DeviceCountSystemCheck', () => {
    describe('runCheck', () => {
      it('should return true when device count is within limit', async () => {
        const mockUtils = {
          dispatch: jest.fn(),
          translation: jest.fn(),
          logger: {} as any,
        }
        const getIdToken = jest.fn().mockResolvedValue({
          bcsc_devices_count: 3,
          bcsc_max_devices: 5,
        })

        const deviceCountCheck = new DeviceCountSystemCheck(getIdToken, mockUtils)

        const result = await deviceCountCheck.runCheck()

        expect(getIdToken).toHaveBeenCalledTimes(1)
        expect(result).toBe(true)
      })

      it('should return false when device count exceeds limit', async () => {
        const mockUtils = {
          dispatch: jest.fn(),
          translation: jest.fn(),
          logger: {} as any,
        }
        const getIdToken = jest.fn().mockResolvedValue({
          bcsc_devices_count: 6,
          bcsc_max_devices: 5,
        })

        const deviceCountCheck = new DeviceCountSystemCheck(getIdToken, mockUtils)

        const result = await deviceCountCheck.runCheck()

        expect(getIdToken).toHaveBeenCalledTimes(1)
        expect(result).toBe(false)
      })

      it('should return false when device count is equal to limit', async () => {
        const mockUtils = {
          dispatch: jest.fn(),
          translation: jest.fn(),
          logger: {} as any,
        }
        const getIdToken = jest.fn().mockResolvedValue({
          bcsc_devices_count: 5,
          bcsc_max_devices: 5,
        })

        const deviceCountCheck = new DeviceCountSystemCheck(getIdToken, mockUtils)

        const result = await deviceCountCheck.runCheck()

        expect(getIdToken).toHaveBeenCalledTimes(1)
        expect(result).toBe(false)
      })
    })

    describe('onFail', () => {
      it('should dispatch a warning banner message', async () => {
        const mockUtils = {
          dispatch: jest.fn(),
          translation: jest.fn().mockReturnValue('Device limit reached'),
          logger: {} as any,
        }
        const getIdToken = jest.fn()

        const deviceCountCheck = new DeviceCountSystemCheck(getIdToken, mockUtils)

        deviceCountCheck.onFail()

        expect(mockUtils.dispatch).toHaveBeenCalledTimes(1)
        expect(mockUtils.dispatch).toHaveBeenCalledWith({
          type: BCDispatchAction.ADD_BANNER_MESSAGE,
          payload: [
            expect.objectContaining({
              id: BCSCBanner.DEVICE_LIMIT_EXCEEDED,
              title: 'Device limit reached',
              type: 'warning',
              variant: 'summary',
              dismissible: false,
            }),
          ],
        })
      })
    })

    describe('onSuccess', () => {
      it('should dispatch action to remove the banner message', async () => {
        const mockUtils = {
          dispatch: jest.fn(),
          translation: jest.fn(),
          logger: {} as any,
        }
        const getIdToken = jest.fn()

        const deviceCountCheck = new DeviceCountSystemCheck(getIdToken, mockUtils)

        deviceCountCheck.onSuccess()

        expect(mockUtils.dispatch).toHaveBeenCalledTimes(1)
        expect(mockUtils.dispatch).toHaveBeenCalledWith({
          type: BCDispatchAction.REMOVE_BANNER_MESSAGE,
          payload: [BCSCBanner.DEVICE_LIMIT_EXCEEDED],
        })
      })
    })
  })

  describe('ServerStatusSystemCheck', () => {
    describe('runCheck', () => {
      it('should return true when server status ok', async () => {
        const mockUtils = {
          dispatch: jest.fn(),
          translation: jest.fn(),
          logger: {} as any,
        }
        const getServerStatus = jest.fn().mockResolvedValue({ status: 'ok' })

        const deviceCountCheck = new ServerStatusSystemCheck(getServerStatus, mockUtils)

        const result = await deviceCountCheck.runCheck()

        expect(getServerStatus).toHaveBeenCalledTimes(1)
        expect(result).toBe(true)
      })

      it('should return false when server status not ok', async () => {
        const mockUtils = {
          dispatch: jest.fn(),
          translation: jest.fn(),
          logger: {} as any,
        }
        const getServerStatus = jest.fn().mockResolvedValue({ status: 'down' })

        const deviceCountCheck = new ServerStatusSystemCheck(getServerStatus, mockUtils)

        const result = await deviceCountCheck.runCheck()

        expect(getServerStatus).toHaveBeenCalledTimes(1)
        expect(result).toBe(false)
      })
    })

    describe('onFail', () => {
      it('should dispatch an error banner message', async () => {
        const mockUtils = {
          dispatch: jest.fn(),
          translation: jest.fn().mockReturnValue('Server unavailable'),
          logger: {} as any,
        }
        const getServerStatus = jest.fn()

        const serverStatusCheck = new ServerStatusSystemCheck(getServerStatus, mockUtils)

        serverStatusCheck.onFail()

        expect(mockUtils.dispatch).toHaveBeenCalledTimes(1)
        expect(mockUtils.dispatch).toHaveBeenCalledWith({
          type: BCDispatchAction.ADD_BANNER_MESSAGE,
          payload: [
            expect.objectContaining({
              id: BCSCBanner.IAS_SERVER_UNAVAILABLE,
              title: 'Server unavailable',
              type: 'error',
              variant: 'summary',
              dismissible: true,
            }),
          ],
        })
      })
    })

    describe('onSuccess', () => {
      it('should dispatch action to remove the banner message', async () => {
        const mockUtils = {
          dispatch: jest.fn(),
          translation: jest.fn(),
          logger: {} as any,
        }

        const getServerStatus = jest.fn()

        const serverStatusCheck = new ServerStatusSystemCheck(getServerStatus, mockUtils)

        serverStatusCheck.onSuccess()

        expect(mockUtils.dispatch).toHaveBeenCalledTimes(1)
        expect(mockUtils.dispatch).toHaveBeenCalledWith({
          type: BCDispatchAction.REMOVE_BANNER_MESSAGE,
          payload: [BCSCBanner.IAS_SERVER_UNAVAILABLE],
        })
      })
    })
  })
})
