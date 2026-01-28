import { VerificationResponseService } from '@/bcsc-theme/features/verification-response'
import { CommonActions } from '@react-navigation/native'
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
  },
}))

// Mock bifold services
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

jest.mock('@bifold/core', () => ({
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
    evidence: {
      getVerificationRequestStatus: mockGetVerificationRequestStatus,
    },
    token: {
      checkDeviceCodeStatus: mockCheckDeviceCodeStatus,
    },
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
  beforeEach(() => {
    jest.clearAllMocks()
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
    // Buffer an approval before the hook mounts (simulating cold-start)
    mockVerificationResponseService.handleApproval()
    expect(mockVerificationResponseService.hasPendingApproval).toBe(true)

    // Now mount the hook
    renderHook(() => useVerificationResponseListener())

    // The pending approval should be processed and navigation should occur
    await waitFor(() => {
      expect(mockVerificationResponseService.hasPendingApproval).toBe(false)
    })

    expect(mockDispatch).toHaveBeenCalled()
    expect(CommonActions.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: BCSCScreens.VerificationSuccess }],
    })
  })

  describe('direct_approval (in-person verification)', () => {
    it('should navigate to VerificationSuccess screen', async () => {
      renderHook(() => useVerificationResponseListener())

      // Trigger the service to emit direct_approval
      act(() => {
        mockVerificationResponseService.handleApproval()
      })

      // Token fetch happens first, then navigation
      await waitFor(() => {
        expect(mockCheckDeviceCodeStatus).toHaveBeenCalledWith('test-device-code', 'test-user-code')
      })
      await waitFor(() => {
        expect(CommonActions.reset).toHaveBeenCalledWith({
          index: 0,
          routes: [{ name: BCSCScreens.VerificationSuccess }],
        })
      })
      expect(mockDispatch).toHaveBeenCalled()
    })

    it('should log when direct approval event is received', async () => {
      renderHook(() => useVerificationResponseListener())

      act(() => {
        mockVerificationResponseService.handleApproval()
      })

      await waitFor(() => {
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Direct approval event received'))
      })
    })

    it('should not navigate if deviceCode is missing', async () => {
      // Override the store mock for this test
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { useStore } = require('@bifold/core')
      useStore.mockReturnValueOnce([
        {
          bcscSecure: {
            deviceCode: undefined,
            userCode: 'test-user-code',
          },
        },
      ])

      renderHook(() => useVerificationResponseListener())

      act(() => {
        mockVerificationResponseService.handleApproval()
      })

      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Missing deviceCode or userCode'))
      })

      expect(mockDispatch).not.toHaveBeenCalled()
    })

    it('should not navigate when checkDeviceCodeStatus fails during direct approval', async () => {
      mockCheckDeviceCodeStatus.mockRejectedValueOnce(new Error('Token exchange failed'))

      renderHook(() => useVerificationResponseListener())

      await act(async () => {
        mockVerificationResponseService.handleApproval()
      })

      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to handle direct approval: Token exchange failed')
        )
      })

      expect(mockCheckDeviceCodeStatus).toHaveBeenCalledWith('test-device-code', 'test-user-code')
      expect(mockDispatch).not.toHaveBeenCalled()
    })

    it('should handle non-Error thrown by checkDeviceCodeStatus during direct approval', async () => {
      mockCheckDeviceCodeStatus.mockRejectedValueOnce('String error')

      renderHook(() => useVerificationResponseListener())

      await act(async () => {
        mockVerificationResponseService.handleApproval()
      })

      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to handle direct approval: String error')
        )
      })

      expect(mockDispatch).not.toHaveBeenCalled()
    })
  })

  describe('request_reviewed (send-video verification)', () => {
    it('should check status and navigate if verified', async () => {
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

      // Token fetch happens in the listener before navigation
      await waitFor(() => {
        expect(mockCheckDeviceCodeStatus).toHaveBeenCalledWith('test-device-code', 'test-user-code')
      })
      await waitFor(() => {
        expect(CommonActions.reset).toHaveBeenCalledWith({
          index: 0,
          routes: [{ name: BCSCScreens.VerificationSuccess }],
        })
      })
      expect(mockDispatch).toHaveBeenCalled()
    })

    it('should not navigate if status is not verified', async () => {
      mockGetVerificationRequestStatus.mockResolvedValueOnce({ status: 'pending' })

      renderHook(() => useVerificationResponseListener())

      act(() => {
        mockVerificationResponseService.handleRequestReviewed()
      })

      await waitFor(() => {
        expect(mockGetVerificationRequestStatus).toHaveBeenCalledWith('test-verification-request-id')
      })

      // Should log that status is not verified
      await waitFor(() => {
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("status is 'pending', not navigating"))
      })

      // Should NOT navigate
      expect(mockDispatch).not.toHaveBeenCalled()
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
      expect(mockDispatch).not.toHaveBeenCalled()
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
      expect(mockDispatch).not.toHaveBeenCalled()
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

      expect(mockDispatch).not.toHaveBeenCalled()
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

      expect(mockDispatch).not.toHaveBeenCalled()
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

      // Wait for the handler to be captured
      await waitFor(() => {
        expect(navigationHandler).toBeDefined()
      })

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

      expect(mockDispatch).not.toHaveBeenCalled()
    })
  })
})
