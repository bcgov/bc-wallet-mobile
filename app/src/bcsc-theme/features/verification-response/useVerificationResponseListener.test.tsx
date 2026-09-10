import { VerificationResponseService } from '@/bcsc-theme/features/verification-response'
import { useNavigation } from '@mocks/@react-navigation/native'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import { BCSCScreens } from '../../types/navigators'
import { useVerificationResponseListener } from './useVerificationResponseListener'

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

describe('useVerificationResponseListener', () => {
  const mockNavigationDispatch = useNavigation().dispatch

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

    expect(mockStoreDispatch).toHaveBeenCalledWith({
      type: 'bcsc/updateSecureVerificationRequestStatus',
      payload: ['verified'],
    })
  })

  describe('request_reviewed (send-video verification)', () => {
    it('should fetch tokens and record the verified status, clearing any stale status message', async () => {
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
        expect(mockStoreDispatch).toHaveBeenCalledWith({
          type: 'bcsc/updateSecureVerificationRequestStatus',
          payload: ['verified'],
        })
        // A previous cancellation reason must not survive into the success screen
        expect(mockStoreDispatch).toHaveBeenCalledWith({
          type: 'bcsc/updateSecureVerificationRequestStatusMessage',
          payload: [undefined],
        })
      })
    })

    it('should record the cancelled status and the agent reason', async () => {
      mockGetVerificationRequestStatus.mockResolvedValueOnce({
        status: 'cancelled',
        status_message: 'Face does not match',
      })

      renderHook(() => useVerificationResponseListener())

      act(() => {
        mockVerificationResponseService.handleRequestReviewed()
      })

      await waitFor(() => {
        expect(mockGetVerificationRequestStatus).toHaveBeenCalledWith('test-verification-request-id')
      })

      await waitFor(() => {
        expect(mockStoreDispatch).toHaveBeenCalledWith({
          type: 'bcsc/updateSecureVerificationRequestStatus',
          payload: ['cancelled'],
        })
        expect(mockStoreDispatch).toHaveBeenCalledWith({
          type: 'bcsc/updateSecureVerificationRequestStatusMessage',
          payload: ['Face does not match'],
        })
      })
      expect(mockCheckDeviceCodeStatus).not.toHaveBeenCalled()
    })

    it('should record the cancelled status with an undefined reason when status_message is missing', async () => {
      mockGetVerificationRequestStatus.mockResolvedValueOnce({ status: 'cancelled' })

      renderHook(() => useVerificationResponseListener())

      act(() => {
        mockVerificationResponseService.handleRequestReviewed()
      })

      await waitFor(() => {
        expect(mockStoreDispatch).toHaveBeenCalledWith({
          type: 'bcsc/updateSecureVerificationRequestStatus',
          payload: ['cancelled'],
        })
        expect(mockStoreDispatch).toHaveBeenCalledWith({
          type: 'bcsc/updateSecureVerificationRequestStatusMessage',
          payload: [undefined],
        })
      })
      expect(mockCheckDeviceCodeStatus).not.toHaveBeenCalled()
    })

    it('should record the pending status without fetching tokens', async () => {
      mockGetVerificationRequestStatus.mockResolvedValueOnce({ status: 'pending' })

      renderHook(() => useVerificationResponseListener())

      act(() => {
        mockVerificationResponseService.handleRequestReviewed()
      })

      await waitFor(() => {
        expect(mockGetVerificationRequestStatus).toHaveBeenCalledWith('test-verification-request-id')
      })

      await waitFor(() => {
        expect(mockStoreDispatch).toHaveBeenCalledWith({
          type: 'bcsc/updateSecureVerificationRequestStatus',
          payload: ['pending'],
        })
        expect(mockStoreDispatch).toHaveBeenCalledWith({
          type: 'bcsc/updateSecureVerificationRequestStatusMessage',
          payload: [undefined],
        })
      })

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("status is 'pending', not navigating"))
      expect(mockCheckDeviceCodeStatus).not.toHaveBeenCalled()
    })

    it('should not proceed if verificationRequestId is missing', async () => {
      // Override the store mock for this test
      // eslint-disable-next-line @typescript-eslint/no-var-requires
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

      renderHook(() => useVerificationResponseListener())

      act(() => {
        mockVerificationResponseService.handleRequestReviewed()
      })

      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('verificationRequestId undefined'))
      })

      expect(mockGetVerificationRequestStatus).not.toHaveBeenCalled()
    })

    it('should not proceed if deviceCode is missing', async () => {
      // Override the store mock for this test
      // eslint-disable-next-line @typescript-eslint/no-var-requires
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

      renderHook(() => useVerificationResponseListener())

      act(() => {
        mockVerificationResponseService.handleRequestReviewed()
      })

      // Validation happens before API call, so getVerificationRequestStatus should NOT be called
      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Missing deviceCode undefined'))
      })

      expect(mockGetVerificationRequestStatus).not.toHaveBeenCalled()
    })

    it('should log when request reviewed event is received', async () => {
      mockGetVerificationRequestStatus.mockResolvedValueOnce({ status: 'verified' })

      renderHook(() => useVerificationResponseListener())

      act(() => {
        mockVerificationResponseService.handleRequestReviewed()
      })

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

      renderHook(() => useVerificationResponseListener())

      act(() => {
        mockVerificationResponseService.handleRequestReviewed()
      })

      await waitFor(() => {
        expect(mockStoreDispatch).toHaveBeenCalledWith({
          type: 'bcsc/updateSecureVerificationRequestStatus',
          payload: ['verified'],
        })
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
