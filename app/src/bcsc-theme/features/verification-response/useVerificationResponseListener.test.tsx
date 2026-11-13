import { VerificationResponseService } from '@/bcsc-theme/features/verification-response'
import { AppEventCode } from '@/events/appEventCode'
import { useNavigation } from '@mocks/@react-navigation/native'
import { mockAppError } from '@mocks/helpers/error'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import { BCSCScreens } from '../../types/navigators'
import { useVerificationResponseListener } from './useVerificationResponseListener'

// Mock react-navigation
const mockDispatch = jest.fn()
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(() => ({
    dispatch: mockDispatch,
  })),
  CommonActions: {
    reset: jest.fn((config) => ({ type: 'RESET', payload: config })),
    navigate: jest.fn((config) => ({ type: 'NAVIGATE', payload: config })),
  },
  // The global __mocks__/@react-navigation/core.ts manual mock (auto-applied to any nested
  // require('@react-navigation/core'), including native's own internal re-export of it) doesn't
  // export createNavigationContainerRef or createNavigatorFactory, so jest.requireActual above
  // doesn't pick them up here. This suite pulls in NavigationContainerContext (which calls
  // createNavigationContainerRef at module load time) and @react-navigation/stack (which calls
  // createNavigatorFactory at module load time) transitively via the store/logger import chain,
  // so both just need to exist as callable stubs.
  createNavigationContainerRef: jest.fn(() => ({
    isReady: jest.fn(() => false),
    getCurrentRoute: jest.fn(() => undefined),
  })),
  createNavigatorFactory: jest.fn(),
}))

// Mock bifold services
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}
const mockStoreDispatch = jest.fn()

jest.mock('@bifold/core', () => ({
  defaultState: { preferences: {}, tours: {}, onboarding: {}, loginAttempt: {}, migration: {} },
  mergeReducers: jest.fn((_base: any, custom: any) => custom),
  reducer: jest.fn(),
  PersistentStorage: { storeValueForKey: jest.fn() },
  TOKENS: { UTIL_LOGGER: 'UTIL_LOGGER' },
  useServices: jest.fn(() => [mockLogger]),
  useStore: jest.fn(() => [
    {
      bcscSecure: {
        deviceCode: 'test-device-code',
        userCode: 'test-user-code',
        verificationRequestId: 'test-verification-request-id',
      },
    },
    mockStoreDispatch,
  ]),
}))

// Mock the API
const mockGetVerificationRequestStatus = jest.fn().mockResolvedValue({
  status: 'verified',
})
const mockCheckDeviceCodeStatus = jest.fn().mockResolvedValue({
  refresh_token: 'test-refresh-token',
})

jest.mock('@/bcsc-theme/api/hooks/useApi', () => ({
  __esModule: true,
  default: () => ({
    token: {
      checkDeviceCodeStatus: mockCheckDeviceCodeStatus,
    },
  }),
}))

jest.mock('@/bcsc-theme/services/hooks/useEvidenceService', () => ({
  useEvidenceService: () => ({
    getVerificationRequestStatus: mockGetVerificationRequestStatus,
  }),
}))

// Create a real service for testing - prefixed with 'mock' to allow jest.mock() access
let mockVerificationResponseService: VerificationResponseService

// Mock the service context
jest.mock('@/bcsc-theme/features/verification-response', () => {
  const actual = jest.requireActual('@/bcsc-theme/features/verification-response')
  return {
    ...actual,
    useVerificationResponseService: () => mockVerificationResponseService,
  }
})

// One event per result, so the pending screen and the Home banner can never disagree
const expectStatusReceived = (payload: { status: string; status_message?: string }) => {
  expect(mockStoreDispatch).toHaveBeenCalledTimes(1)
  expect(mockStoreDispatch).toHaveBeenCalledWith({
    type: 'bcsc/verificationStatusReceived',
    payload: [payload],
  })
}

describe('useVerificationResponseListener', () => {
  const mockNavigationDispatch = useNavigation().dispatch

  const triggerReview = () => {
    const view = renderHook(() => useVerificationResponseListener())
    act(() => {
      mockVerificationResponseService.handleRequestReviewed()
    })
    return view
  }

  const deferred = <T,>() => {
    let resolve: (value: T) => void = () => undefined
    const promise = new Promise<T>((res) => {
      resolve = res
    })
    return { promise, resolve }
  }

  // "Choose another way" clears the request id while a call is in flight, then the call settles
  const clearRequestThenSettle = async (rerender: (props: object) => void, settle: () => void) => {
    // require returns the jest.mock'd module, so this test can override useStore mid-test
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useStore } = require('@bifold/core')
    const originalUseStore = useStore.getMockImplementation()
    useStore.mockReturnValue([
      { bcscSecure: { deviceCode: 'test-device-code', userCode: 'test-user-code' } },
      mockStoreDispatch,
    ])
    try {
      rerender({})
      await act(async () => {
        settle()
      })
    } finally {
      useStore.mockImplementation(originalUseStore)
    }
  }

  beforeEach(() => {
    // Reset API mocks
    mockGetVerificationRequestStatus.mockResolvedValue({ status: 'verified' })
    mockCheckDeviceCodeStatus.mockResolvedValue({ refresh_token: 'test-refresh-token' })
    // Create a fresh service for each test
    mockVerificationResponseService = new VerificationResponseService(mockLogger as any)
  })

  it('should subscribe to navigation events on mount', () => {
    const onNavigationRequestSpy = jest.spyOn(mockVerificationResponseService, 'onNavigationRequest')

    renderHook(() => useVerificationResponseListener())

    expect(onNavigationRequestSpy).toHaveBeenCalledWith(expect.any(Function))
  })

  it('should unsubscribe from service on unmount', () => {
    const unsubscribeMock = jest.fn()
    jest.spyOn(mockVerificationResponseService, 'onNavigationRequest').mockReturnValue(unsubscribeMock)

    const { unmount } = renderHook(() => useVerificationResponseListener())

    unmount()

    expect(unsubscribeMock).toHaveBeenCalled()
  })

  it('should process pending approval on mount if one exists', async () => {
    // Buffer a request_reviewed before the hook mounts (simulating cold-start)
    mockVerificationResponseService.handleRequestReviewed()
    expect(mockVerificationResponseService.hasPendingApproval).toBe(true)

    // Now mount the hook
    renderHook(() => useVerificationResponseListener())

    // The pending approval should be processed and store should be updated
    await waitFor(() => {
      expect(mockVerificationResponseService.hasPendingApproval).toBe(false)
    })

    expectStatusReceived({ status: 'verified' })
  })

  describe('request_reviewed (send-video verification)', () => {
    it('should fetch tokens, then record one verified status event', async () => {
      mockGetVerificationRequestStatus.mockResolvedValueOnce({ status: 'verified' })

      renderHook(() => useVerificationResponseListener())

      // Trigger the service to emit request_reviewed
      act(() => {
        mockVerificationResponseService.handleRequestReviewed()
      })

      // Wait for the status check
      await waitFor(() => {
        expect(mockGetVerificationRequestStatus).toHaveBeenCalledWith('test-verification-request-id')
      })

      // Token fetch happens in the listener before the store is updated
      await waitFor(() => {
        expect(mockCheckDeviceCodeStatus).toHaveBeenCalledWith('test-device-code', 'test-user-code')
      })
      await waitFor(() => {
        expectStatusReceived({ status: 'verified' })
      })
    })

    it('drops a status that arrives after the request was cancelled', async () => {
      const fetch = deferred<{ status: string }>()
      mockGetVerificationRequestStatus.mockReturnValueOnce(fetch.promise)
      const { rerender } = triggerReview()
      await waitFor(() => {
        expect(mockGetVerificationRequestStatus).toHaveBeenCalledWith('test-verification-request-id')
      })

      await clearRequestThenSettle(rerender, () => fetch.resolve({ status: 'cancelled' }))

      expect(mockStoreDispatch).not.toHaveBeenCalled()
      expect(mockCheckDeviceCodeStatus).not.toHaveBeenCalled()
    })

    it('drops an unrecognised-status verification that completes after the request was cancelled', async () => {
      mockGetVerificationRequestStatus.mockResolvedValueOnce({ status: 'expired' })
      const exchange = deferred<unknown>()
      mockCheckDeviceCodeStatus.mockReturnValueOnce(exchange.promise)
      const { rerender } = triggerReview()
      await waitFor(() => {
        expect(mockCheckDeviceCodeStatus).toHaveBeenCalledWith('test-device-code', 'test-user-code')
      })

      await clearRequestThenSettle(rerender, () => exchange.resolve({ refresh_token: 'test-refresh-token' }))

      expect(mockStoreDispatch).not.toHaveBeenCalled()
    })

    it.each([
      ['the token exchange fails on a verified status', 'verified', new Error('exchange failed'), 'exchange failed'],
      [
        'an unrecognised status fails with ALREADY_VERIFIED',
        'expired',
        mockAppError(AppEventCode.ALREADY_VERIFIED),
        'Failed to handle request reviewed',
      ],
    ])('should store nothing and log the error when %s', async (_case, status, exchangeError, logged) => {
      mockGetVerificationRequestStatus.mockResolvedValueOnce({ status })
      mockCheckDeviceCodeStatus.mockRejectedValueOnce(exchangeError)

      triggerReview()

      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining(logged))
      })
      expect(mockStoreDispatch).not.toHaveBeenCalled()
    })

    it('should record the cancelled status and the agent reason', async () => {
      mockGetVerificationRequestStatus.mockResolvedValueOnce({
        status: 'cancelled',
        status_message: 'Face does not match',
      })

      triggerReview()

      await waitFor(() => {
        expect(mockGetVerificationRequestStatus).toHaveBeenCalledWith('test-verification-request-id')
      })

      await waitFor(() => {
        expectStatusReceived({ status: 'cancelled', status_message: 'Face does not match' })
      })
      expect(mockCheckDeviceCodeStatus).not.toHaveBeenCalled()
    })

    it('should record the cancelled status with an undefined reason when status_message is missing', async () => {
      mockGetVerificationRequestStatus.mockResolvedValueOnce({ status: 'cancelled' })

      triggerReview()

      await waitFor(() => {
        expectStatusReceived({ status: 'cancelled', status_message: undefined })
      })
      expect(mockCheckDeviceCodeStatus).not.toHaveBeenCalled()
    })

    it('should record the pending status without fetching tokens', async () => {
      mockGetVerificationRequestStatus.mockResolvedValueOnce({ status: 'pending' })

      triggerReview()

      await waitFor(() => {
        expect(mockGetVerificationRequestStatus).toHaveBeenCalledWith('test-verification-request-id')
      })

      await waitFor(() => {
        expectStatusReceived({ status: 'pending' })
      })

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("status is 'pending', not navigating"))
      expect(mockCheckDeviceCodeStatus).not.toHaveBeenCalled()
    })

    it.each([AppEventCode.AUTHORIZATION_PENDING, AppEventCode.VERIFY_NOT_COMPLETE])(
      'should leave state unchanged when the exchange for an unrecognised status rejects with %s',
      async (code) => {
        mockGetVerificationRequestStatus.mockResolvedValueOnce({ status: 'expired' })
        mockCheckDeviceCodeStatus.mockRejectedValueOnce(mockAppError(code))

        triggerReview()

        await waitFor(() => {
          expect(mockCheckDeviceCodeStatus).toHaveBeenCalledWith('test-device-code', 'test-user-code')
        })

        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining("Unrecognised verification status 'expired'")
        )
        expect(mockStoreDispatch).not.toHaveBeenCalled()
        expect(mockLogger.error).not.toHaveBeenCalled()
      }
    )

    it('should store verified when the exchange for an unrecognised status resolves', async () => {
      mockGetVerificationRequestStatus.mockResolvedValueOnce({ status: 'expired' })

      triggerReview()

      await waitFor(() => {
        expectStatusReceived({ status: 'verified' })
      })

      expect(mockCheckDeviceCodeStatus).toHaveBeenCalledTimes(1)
      expect(mockCheckDeviceCodeStatus).toHaveBeenCalledWith('test-device-code', 'test-user-code')
    })

    it('should not proceed if verificationRequestId is missing', async () => {
      // Override the store mock for this test
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { useStore } = require('@bifold/core')
      useStore.mockReturnValueOnce([
        {
          bcscSecure: {
            deviceCode: 'test-device-code',
            userCode: 'test-user-code',
            verificationRequestId: undefined,
          },
        },
      ])

      triggerReview()

      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('verificationRequestId undefined'))
      })

      expect(mockGetVerificationRequestStatus).not.toHaveBeenCalled()
      expect(mockCheckDeviceCodeStatus).not.toHaveBeenCalled()
    })

    it('should not proceed if deviceCode is missing', async () => {
      // Override the store mock for this test
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { useStore } = require('@bifold/core')
      useStore.mockReturnValueOnce([
        {
          bcscSecure: {
            deviceCode: undefined,
            userCode: 'test-user-code',
            verificationRequestId: 'test-verification-request-id',
          },
        },
      ])

      triggerReview()

      // Validation happens before API call, so getVerificationRequestStatus should NOT be called
      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Missing deviceCode undefined'))
      })

      expect(mockGetVerificationRequestStatus).not.toHaveBeenCalled()
      expect(mockCheckDeviceCodeStatus).not.toHaveBeenCalled()
    })

    it('should log when request reviewed event is received', async () => {
      mockGetVerificationRequestStatus.mockResolvedValueOnce({ status: 'verified' })

      triggerReview()

      await waitFor(() => {
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Request reviewed event received'))
      })
    })

    it('should handle error when getVerificationRequestStatus fails', async () => {
      const apiError = new Error('API request failed')
      mockGetVerificationRequestStatus.mockReset()
      mockGetVerificationRequestStatus.mockRejectedValue(apiError)

      renderHook(() => useVerificationResponseListener())

      await act(async () => {
        mockVerificationResponseService.handleRequestReviewed()
      })

      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to handle request reviewed: API request failed')
        )
      })
    })

    it('should handle non-Error objects thrown by getVerificationRequestStatus', async () => {
      mockGetVerificationRequestStatus.mockReset()
      mockGetVerificationRequestStatus.mockRejectedValue('String error')

      renderHook(() => useVerificationResponseListener())

      await act(async () => {
        mockVerificationResponseService.handleRequestReviewed()
      })

      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to handle request reviewed: String error')
        )
      })
    })

    it('stays navigation-free — the verified path only writes to the store', async () => {
      // The hook deliberately has no navigation dependency: RootStack reacts to the store instead.
      // If navigation ever moves back in here, this guard is the decision to revisit.
      mockGetVerificationRequestStatus.mockResolvedValueOnce({ status: 'verified' })

      triggerReview()

      await waitFor(() => {
        expectStatusReceived({ status: 'verified' })
      })

      expect(mockNavigationDispatch).not.toHaveBeenCalled()
    })
  })

  describe('unknown event types', () => {
    it('should log warning for unknown event type', async () => {
      // Capture the navigation handler that gets registered
      let navigationHandler: ((event: any) => void) | undefined

      const onNavigationRequestSpy = jest.spyOn(mockVerificationResponseService, 'onNavigationRequest')
      onNavigationRequestSpy.mockImplementation((handler) => {
        navigationHandler = handler
        return jest.fn() // Return unsubscribe function
      })

      renderHook(() => useVerificationResponseListener())

      expect(onNavigationRequestSpy).toHaveBeenCalledWith(expect.any(Function))

      // Call the handler directly with an unknown event type
      await act(async () => {
        if (navigationHandler) {
          await navigationHandler({
            screen: BCSCScreens.VerificationSuccess,
            eventType: 'unknown_event_type' as any,
          })
        }
      })

      await waitFor(() => {
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Unknown event type: unknown_event_type'))
      })
    })
  })
})
