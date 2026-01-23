import { VerificationApprovalService } from '@/bcsc-theme/features/verification-approval'
import { CommonActions } from '@react-navigation/native'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import { BCSCScreens } from '../types/navigators'
import { useVerificationApprovalListener } from './useVerificationApprovalListener'

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

jest.mock('@/bcsc-theme/api/hooks/useApi', () => ({
  __esModule: true,
  default: () => ({
    evidence: {
      getVerificationRequestStatus: mockGetVerificationRequestStatus,
    },
  }),
}))

// Create a real service for testing - prefixed with 'mock' to allow jest.mock() access
let mockVerificationApprovalService: VerificationApprovalService

// Mock the service context
jest.mock('@/bcsc-theme/features/verification-approval', () => {
  const actual = jest.requireActual('@/bcsc-theme/features/verification-approval')
  return {
    ...actual,
    useVerificationApprovalService: () => mockVerificationApprovalService,
  }
})

describe('useVerificationApprovalListener', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Create a fresh service for each test
    mockVerificationApprovalService = new VerificationApprovalService(mockLogger as any)
  })

  it('should subscribe to navigation events on mount', () => {
    const onNavigationRequestSpy = jest.spyOn(mockVerificationApprovalService, 'onNavigationRequest')

    renderHook(() => useVerificationApprovalListener())

    expect(onNavigationRequestSpy).toHaveBeenCalledWith(expect.any(Function))
  })

  it('should unsubscribe from service on unmount', () => {
    const unsubscribeMock = jest.fn()
    jest.spyOn(mockVerificationApprovalService, 'onNavigationRequest').mockReturnValue(unsubscribeMock)

    const { unmount } = renderHook(() => useVerificationApprovalListener())

    unmount()

    expect(unsubscribeMock).toHaveBeenCalled()
  })

  it('should process pending approval on mount if one exists', async () => {
    // Buffer an approval before the hook mounts (simulating cold-start)
    mockVerificationApprovalService.handleApproval()
    expect(mockVerificationApprovalService.hasPendingApproval).toBe(true)

    // Now mount the hook
    renderHook(() => useVerificationApprovalListener())

    // The pending approval should be processed and navigation should occur
    await waitFor(() => {
      expect(mockVerificationApprovalService.hasPendingApproval).toBe(false)
    })

    expect(mockDispatch).toHaveBeenCalled()
    expect(CommonActions.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: BCSCScreens.VerificationSuccess }],
    })
  })

  describe('direct_approval (in-person verification)', () => {
    it('should navigate to VerificationSuccess screen', async () => {
      renderHook(() => useVerificationApprovalListener())

      // Trigger the service to emit direct_approval
      act(() => {
        mockVerificationApprovalService.handleApproval()
      })

      // Navigation should happen immediately (no token fetch)
      await waitFor(() => {
        expect(CommonActions.reset).toHaveBeenCalledWith({
          index: 0,
          routes: [{ name: BCSCScreens.VerificationSuccess }],
        })
      })
      expect(mockDispatch).toHaveBeenCalled()
    })

    it('should log when direct approval event is received', async () => {
      renderHook(() => useVerificationApprovalListener())

      act(() => {
        mockVerificationApprovalService.handleApproval()
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

      renderHook(() => useVerificationApprovalListener())

      act(() => {
        mockVerificationApprovalService.handleApproval()
      })

      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Missing deviceCode or userCode'))
      })

      expect(mockDispatch).not.toHaveBeenCalled()
    })
  })

  describe('request_reviewed (send-video verification)', () => {
    it('should check status and navigate if verified', async () => {
      mockGetVerificationRequestStatus.mockResolvedValueOnce({ status: 'verified' })

      renderHook(() => useVerificationApprovalListener())

      // Trigger the service to emit request_reviewed
      act(() => {
        mockVerificationApprovalService.handleRequestReviewed()
      })

      // Wait for the status check
      await waitFor(() => {
        expect(mockGetVerificationRequestStatus).toHaveBeenCalledWith('test-verification-request-id')
      })

      // Should navigate to success screen (token fetch happens in VerificationSuccessScreen)
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

      renderHook(() => useVerificationApprovalListener())

      act(() => {
        mockVerificationApprovalService.handleRequestReviewed()
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

      renderHook(() => useVerificationApprovalListener())

      act(() => {
        mockVerificationApprovalService.handleRequestReviewed()
      })

      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Missing verificationRequestId'))
      })

      expect(mockGetVerificationRequestStatus).not.toHaveBeenCalled()
      expect(mockDispatch).not.toHaveBeenCalled()
    })

    it('should not navigate if deviceCode is missing after status verified', async () => {
      mockGetVerificationRequestStatus.mockResolvedValueOnce({ status: 'verified' })

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

      renderHook(() => useVerificationApprovalListener())

      act(() => {
        mockVerificationApprovalService.handleRequestReviewed()
      })

      await waitFor(() => {
        expect(mockGetVerificationRequestStatus).toHaveBeenCalledWith('test-verification-request-id')
      })

      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Missing deviceCode or userCode'))
      })

      expect(mockDispatch).not.toHaveBeenCalled()
    })

    it('should log when request reviewed event is received', async () => {
      mockGetVerificationRequestStatus.mockResolvedValueOnce({ status: 'verified' })

      renderHook(() => useVerificationApprovalListener())

      act(() => {
        mockVerificationApprovalService.handleRequestReviewed()
      })

      await waitFor(() => {
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Request reviewed event received'))
      })
    })

    it('should handle error when getVerificationRequestStatus fails', async () => {
      const apiError = new Error('API request failed')
      mockGetVerificationRequestStatus.mockRejectedValueOnce(apiError)

      renderHook(() => useVerificationApprovalListener())

      act(() => {
        mockVerificationApprovalService.handleRequestReviewed()
      })

      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to handle request reviewed: API request failed')
        )
      })

      expect(mockDispatch).not.toHaveBeenCalled()
    })

    it('should handle non-Error objects thrown by getVerificationRequestStatus', async () => {
      mockGetVerificationRequestStatus.mockRejectedValueOnce('String error')

      renderHook(() => useVerificationApprovalListener())

      act(() => {
        mockVerificationApprovalService.handleRequestReviewed()
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

      const onNavigationRequestSpy = jest.spyOn(mockVerificationApprovalService, 'onNavigationRequest')
      onNavigationRequestSpy.mockImplementation((handler) => {
        navigationHandler = handler
        return jest.fn() // Return unsubscribe function
      })

      renderHook(() => useVerificationApprovalListener())

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
