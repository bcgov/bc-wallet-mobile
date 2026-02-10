import { BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import { BCSCModals } from '@/bcsc-theme/types/navigators'
import { DeviceCountSystemCheck } from '@/services/system-checks/DeviceCountSystemCheck'
import { InternetStatusSystemCheck } from '@/services/system-checks/InternetStatusSystemCheck'
import { ServerStatusSystemCheck } from '@/services/system-checks/ServerStatusSystemCheck'
import { runSystemChecks, SystemCheckStrategy } from '@/services/system-checks/system-checks'
import { BCDispatchAction } from '@/store'
import { MockLogger } from '@bifold/core'

describe('System Checks', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

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
          translation: jest.fn() as any,
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
          translation: jest.fn() as any,
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
          translation: jest.fn() as any,
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
          translation: jest.fn().mockReturnValue('Device limit reached') as any,
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
          translation: jest.fn() as any,
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
          translation: jest.fn() as any,
          logger: {} as any,
        }
        const serverStatus: any = { status: 'ok' }

        const deviceCountCheck = new ServerStatusSystemCheck(serverStatus, mockUtils)

        const result = deviceCountCheck.runCheck()

        expect(result).toBe(true)
      })

      it('should return false when server status not ok', async () => {
        const mockUtils = {
          dispatch: jest.fn(),
          translation: jest.fn() as any,
          logger: {} as any,
        }
        const serverStatus: any = { status: 'unknown' }

        const deviceCountCheck = new ServerStatusSystemCheck(serverStatus, mockUtils)

        const result = deviceCountCheck.runCheck()

        expect(result).toBe(false)
      })
    })

    describe('onFail', () => {
      it('should dispatch an error banner message', async () => {
        const mockUtils = {
          dispatch: jest.fn(),
          translation: jest.fn().mockReturnValue('Server unavailable') as any,
          logger: {} as any,
        }
        const serverStatus: any = { status: 'ok' }

        const serverStatusCheck = new ServerStatusSystemCheck(serverStatus, mockUtils)

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

      it('should use server status message if available', async () => {
        const mockUtils = {
          dispatch: jest.fn(),
          translation: jest.fn().mockReturnValue('Server unavailable') as any,
          logger: {} as any,
        }

        const serverStatus: any = { status: 'ok' }

        const serverStatusCheck: any = new ServerStatusSystemCheck(serverStatus, mockUtils)

        serverStatusCheck.serverStatus = {}
        serverStatusCheck.serverStatus.statusMessage = 'Custom server down message'

        serverStatusCheck.onFail()

        expect(mockUtils.dispatch).toHaveBeenCalledTimes(1)
        expect(mockUtils.dispatch).toHaveBeenCalledWith({
          type: BCDispatchAction.ADD_BANNER_MESSAGE,
          payload: [
            expect.objectContaining({
              id: BCSCBanner.IAS_SERVER_UNAVAILABLE,
              title: 'Custom server down message',
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
          translation: jest.fn() as any,
          logger: {} as any,
        }

        const serverStatus: any = { status: 'ok' }

        const serverStatusCheck = new ServerStatusSystemCheck(serverStatus, mockUtils)

        serverStatusCheck.onSuccess()

        expect(mockUtils.dispatch).toHaveBeenCalledTimes(2)
        expect(mockUtils.dispatch).toHaveBeenCalledWith({
          type: BCDispatchAction.REMOVE_BANNER_MESSAGE,
          payload: [BCSCBanner.IAS_SERVER_UNAVAILABLE],
        })
      })

      it('should dispatch info banner if server status message exists', async () => {
        const mockUtils = {
          dispatch: jest.fn(),
          translation: jest.fn() as any,
          logger: {} as any,
        }

        const serverStatus: any = { status: 'ok' }

        const serverStatusCheck: any = new ServerStatusSystemCheck(serverStatus, mockUtils)

        serverStatusCheck.serverStatus = {}
        serverStatusCheck.serverStatus.statusMessage = 'Server maintenance scheduled'

        serverStatusCheck.onSuccess()

        expect(mockUtils.dispatch).toHaveBeenCalledTimes(3)
        expect(mockUtils.dispatch).toHaveBeenCalledWith({
          type: BCDispatchAction.ADD_BANNER_MESSAGE,
          payload: [
            expect.objectContaining({
              id: BCSCBanner.IAS_SERVER_NOTIFICATION,
              title: 'Server maintenance scheduled',
              type: 'info',
              variant: 'summary',
              dismissible: true,
            }),
          ],
        })
      })
    })
  })

  describe('InternetStatusSystemCheck', () => {
    describe('runCheck', () => {
      it('should return true when internet is reachable', async () => {
        const isConnected = true
        const isInternetReachable = true
        const mockNavigation = {} as any
        const mockLogger = new MockLogger()

        const internetStatusCheck = new InternetStatusSystemCheck(
          isConnected,
          isInternetReachable,
          mockNavigation,
          mockLogger
        )

        const result = internetStatusCheck.runCheck()

        expect(result).toBe(true)
      })

      it('should return false when internet is not reachable', async () => {
        const isConnected = false
        const isInternetReachable = null
        const mockNavigation = {} as any
        const mockLogger = new MockLogger()

        const internetStatusCheck = new InternetStatusSystemCheck(
          isConnected,
          isInternetReachable,
          mockNavigation,
          mockLogger
        )

        const result = internetStatusCheck.runCheck()

        expect(result).toBe(false)
      })

      it('should return false when internet is partially reachable', async () => {
        const isConnected = true
        const isInternetReachable = false
        const mockNavigation = {} as any
        const mockLogger = new MockLogger()

        const internetStatusCheck = new InternetStatusSystemCheck(
          isConnected,
          isInternetReachable,
          mockNavigation,
          mockLogger
        )
        const result = internetStatusCheck.runCheck()

        expect(result).toBe(false)
      })
    })
    describe('onFail', () => {
      it('should navigate to InternetDisconnected modal if not already there', () => {
        const isConnected = false
        const isInternetReachable = false
        const mockNavigation = {
          getState: jest.fn().mockReturnValue({ routes: [{ name: 'Home' }], index: 0 }),
          navigate: jest.fn(),
        } as any
        const mockLogger = { warn: jest.fn() } as any

        const internetStatusCheck = new InternetStatusSystemCheck(
          isConnected,
          isInternetReachable,
          mockNavigation,
          mockLogger
        )

        internetStatusCheck.onFail()

        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('No internet'))
        expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCModals.InternetDisconnected)
      })

      it('should not navigate if already on InternetDisconnected modal', () => {
        const isConnected = false
        const isInternetReachable = false
        const mockNavigation = {
          getState: jest.fn().mockReturnValue({ routes: [{ name: BCSCModals.InternetDisconnected }], index: 0 }),
          navigate: jest.fn(),
        } as any
        const mockLogger = { warn: jest.fn() } as any

        const internetStatusCheck = new InternetStatusSystemCheck(
          isConnected,
          isInternetReachable,
          mockNavigation,
          mockLogger
        )

        internetStatusCheck.onFail()

        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('No internet'))
        expect(mockNavigation.navigate).not.toHaveBeenCalled()
      })
    })

    describe('onSuccess', () => {
      it('should navigate back if on InternetDisconnected modal', () => {
        const isConnected = true
        const isInternetReachable = true
        const mockNavigation = {
          getState: jest.fn().mockReturnValue({ routes: [{ name: BCSCModals.InternetDisconnected }], index: 0 }),
          canGoBack: jest.fn().mockReturnValue(true),
          goBack: jest.fn(),
        } as any
        const mockLogger = {} as any

        const internetStatusCheck = new InternetStatusSystemCheck(
          isConnected,
          isInternetReachable,
          mockNavigation,
          mockLogger
        )

        internetStatusCheck.onSuccess()

        expect(mockNavigation.goBack).toHaveBeenCalled()
      })

      it('should not navigate back if not on InternetDisconnected modal', () => {
        const isConnected = true
        const isInternetReachable = true
        const mockNavigation = {
          getState: jest.fn().mockReturnValue({ routes: [{ name: 'Home' }], index: 0 }),
          canGoBack: jest.fn().mockReturnValue(true),
          goBack: jest.fn(),
        } as any
        const mockLogger = {} as any

        const internetStatusCheck = new InternetStatusSystemCheck(
          isConnected,
          isInternetReachable,
          mockNavigation,
          mockLogger
        )

        internetStatusCheck.onSuccess()

        expect(mockNavigation.goBack).not.toHaveBeenCalled()
      })

      it('should not navigate back if cannot go back', () => {
        const isConnected = true
        const isInternetReachable = true
        const mockNavigation = {
          getState: jest.fn().mockReturnValue({ routes: [{ name: BCSCModals.InternetDisconnected }], index: 0 }),
          canGoBack: jest.fn().mockReturnValue(false),
          goBack: jest.fn(),
        } as any
        const mockLogger = {} as any

        const internetStatusCheck = new InternetStatusSystemCheck(
          isConnected,
          isInternetReachable,
          mockNavigation,
          mockLogger
        )

        internetStatusCheck.onSuccess()

        expect(mockNavigation.goBack).not.toHaveBeenCalled()
      })
    })
  })
})
