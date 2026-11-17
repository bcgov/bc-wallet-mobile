/* eslint-disable no-extra-semi */
import { BCSCModals } from '@/bcsc-theme/types/navigators'
import { InternetStatusSystemCheck } from '@/services/system-checks/InternetStatusSystemCheck'
import { runSystemChecks, SystemCheckStrategy } from '@/services/system-checks/system-checks'
import { MockLogger } from '@bifold/core'

/* eslint-disable @typescript-eslint/no-explicit-any */

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

    it('isolates a check that throws in runCheck so the rest of the batch still runs', async () => {
      const throwingOnFail = jest.fn()
      const survivorOnFail = jest.fn()

      const throwingCheck: SystemCheckStrategy = {
        runCheck: jest.fn().mockRejectedValue(new Error('no id token')),
        onFail: throwingOnFail,
      }

      const survivorCheck: SystemCheckStrategy = {
        runCheck: jest.fn().mockResolvedValue(false),
        onFail: survivorOnFail,
      }

      const results = await runSystemChecks([throwingCheck, survivorCheck])

      // The thrown check is recorded as false and its handler is skipped...
      expect(results).toEqual([false, false])
      expect(throwingOnFail).not.toHaveBeenCalled()
      // ...but the surviving check is still handled
      expect(survivorOnFail).toHaveBeenCalledTimes(1)
    })

    it('isolates a check whose handler throws so later checks are still handled', async () => {
      const laterOnFail = jest.fn()

      const checkWithThrowingHandler: SystemCheckStrategy = {
        runCheck: jest.fn().mockResolvedValue(false),
        onFail: jest.fn().mockImplementation(() => {
          throw new Error('handler boom')
        }),
      }

      const laterCheck: SystemCheckStrategy = {
        runCheck: jest.fn().mockResolvedValue(false),
        onFail: laterOnFail,
      }

      const results = await runSystemChecks([checkWithThrowingHandler, laterCheck])

      expect(results).toEqual([false, false])
      expect(laterOnFail).toHaveBeenCalledTimes(1)
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
          getState: jest.fn().mockReturnValue({
            routes: [{ name: 'Home' }],
            index: 0,
            routeNames: ['Home', BCSCModals.InternetDisconnected],
          }),
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

      it('should not navigate when no navigator is mounted (root-stack swap window)', () => {
        const isConnected = false
        const isInternetReachable = false
        const mockNavigation = {
          getState: jest.fn().mockReturnValue(undefined),
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

      it('should not navigate when the current navigator does not register the modal route', () => {
        const isConnected = false
        const isInternetReachable = false
        const mockNavigation = {
          getState: jest.fn().mockReturnValue({ routes: [{ name: 'Home' }], index: 0, routeNames: ['Home'] }),
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
