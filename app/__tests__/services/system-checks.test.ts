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
        const deviceCountCheck = new DeviceCountSystemCheck({
          dispatch: jest.fn(),
          translation: jest.fn(),
          getIdToken: jest.fn().mockResolvedValue({
            bcsc_devices_count: 2,
            bcsc_max_devices: 5,
          }),
        })

        const result = await deviceCountCheck.runCheck()

        expect(result).toBe(true)
      })

      it('should return false when device count exceeds limit', async () => {
        const deviceCountCheck = new DeviceCountSystemCheck({
          dispatch: jest.fn(),
          translation: jest.fn(),
          getIdToken: jest.fn().mockResolvedValue({
            bcsc_devices_count: 6,
            bcsc_max_devices: 5,
          }),
        })

        const result = await deviceCountCheck.runCheck()

        expect(result).toBe(false)
      })

      it('should return false when device count is equal to limit', async () => {
        const deviceCountCheck = new DeviceCountSystemCheck({
          dispatch: jest.fn(),
          translation: jest.fn(),
          getIdToken: jest.fn().mockResolvedValue({
            bcsc_devices_count: 5,
            bcsc_max_devices: 5,
          }),
        })

        const result = await deviceCountCheck.runCheck()

        expect(result).toBe(false)
      })
    })

    describe('onFail', () => {
      it('should dispatch a warning banner message', async () => {
        const mockDispatch = jest.fn()

        const deviceCountCheck = new DeviceCountSystemCheck({
          dispatch: mockDispatch,
          translation: jest.fn().mockReturnValue('Device limit reached'),
          getIdToken: jest.fn(),
        })

        deviceCountCheck.onFail()

        expect(mockDispatch).toHaveBeenCalledWith({
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
        const mockDispatch = jest.fn()

        const deviceCountCheck = new DeviceCountSystemCheck({
          dispatch: mockDispatch,
          translation: jest.fn(),
          getIdToken: jest.fn(),
        })

        deviceCountCheck.onSuccess()

        expect(mockDispatch).toHaveBeenCalledWith({
          type: BCDispatchAction.REMOVE_BANNER_MESSAGE,
          payload: [BCSCBanner.DEVICE_LIMIT_EXCEEDED],
        })
      })
    })
  })

  describe('ServerStatusSystemCheck', () => {
    describe('runCheck', () => {
      it('should return true when server status ok', async () => {
        const deviceCountCheck = new ServerStatusSystemCheck({
          dispatch: jest.fn(),
          translation: jest.fn(),
          getServerStatus: jest.fn().mockResolvedValue({ status: 'ok' }),
        })

        const result = await deviceCountCheck.runCheck()

        expect(result).toBe(true)
      })

      it('should return false when server status not ok', async () => {
        const deviceCountCheck = new ServerStatusSystemCheck({
          dispatch: jest.fn(),
          translation: jest.fn(),
          getServerStatus: jest.fn().mockResolvedValue({ status: 'down' }),
        })

        const result = await deviceCountCheck.runCheck()

        expect(result).toBe(false)
      })
    })

    describe('onFail', () => {
      it('should dispatch an error banner message', async () => {
        const mockDispatch = jest.fn()

        const serverStatusCheck = new ServerStatusSystemCheck({
          dispatch: mockDispatch,
          translation: jest.fn().mockReturnValue('Server unavailable'),
          getServerStatus: jest.fn(),
        })

        serverStatusCheck.onFail()

        expect(mockDispatch).toHaveBeenCalledWith({
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
        const mockDispatch = jest.fn()

        const serverStatusCheck = new ServerStatusSystemCheck({
          dispatch: mockDispatch,
          translation: jest.fn(),
          getServerStatus: jest.fn(),
        })

        serverStatusCheck.onSuccess()

        expect(mockDispatch).toHaveBeenCalledWith({
          type: BCDispatchAction.REMOVE_BANNER_MESSAGE,
          payload: [BCSCBanner.IAS_SERVER_UNAVAILABLE],
        })
      })
    })
  })
})
