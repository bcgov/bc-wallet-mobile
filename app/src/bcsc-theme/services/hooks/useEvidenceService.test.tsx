import useApi from '@/bcsc-theme/api/hooks/useApi'
import { AppError, ErrorCategory } from '@/errors'
import { AppEventCode } from '@/events/appEventCode'
import * as Bifold from '@bifold/core'
import { mockAppError } from '@mocks/helpers/error'
import { renderHook } from '@testing-library/react-native'
import { AxiosError } from 'axios'
import { useEvidenceService } from './useEvidenceService'

jest.mock('@/bcsc-theme/api/hooks/useApi')
jest.mock('@bifold/core', () => ({
  __esModule: true,
  TOKENS: { UTIL_LOGGER: 'UTIL_LOGGER' },
  useServices: jest.fn(),
}))
// Avoids pulling in the real navigation stack (HeaderWithBanner -> NotificationBannerContainer -> store),
// which requires native modules that aren't available under Jest.
jest.mock('@/contexts/NavigationContainerContext', () => ({
  navigationRef: { isReady: () => false, getCurrentRoute: () => undefined },
}))

const mockUpdateVerificationRequest = jest.fn().mockResolvedValue(undefined)
jest.mock('@/bcsc-theme/hooks/useSecureActions', () => ({
  __esModule: true,
  useSecureActions: jest.fn(() => ({
    updateVerificationRequest: mockUpdateVerificationRequest,
  })),
}))

const mockServerErrorAlert = jest.fn()
const mockAlerts = { serverErrorAlert: mockServerErrorAlert }
jest.mock('@/hooks/useAlerts', () => ({
  useAlerts: () => mockAlerts,
}))

const mockLogger = {
  error: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}

const notFoundError = new AppError(
  'Not found',
  { category: ErrorCategory.NETWORK, appEvent: AppEventCode.NOT_FOUND, statusCode: 2113 },
  { cause: new AxiosError('Not Found', 'ERR_BAD_REQUEST', undefined, undefined, { status: 404 } as any), track: false }
)

describe('useEvidenceService', () => {
  const mockEvidenceApi = {
    cancelVerificationRequest: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdateVerificationRequest.mockResolvedValue(undefined)

    jest.mocked(Bifold).useServices.mockReturnValue([mockLogger] as any)
    jest.mocked(useApi).mockReturnValue({ evidence: mockEvidenceApi } as any)
  })

  describe('cancelVerificationRequest', () => {
    it('should call evidenceApi.cancelVerificationRequest, clear the verification request, and return data', async () => {
      const mockData = { status: 'cancelled' }
      mockEvidenceApi.cancelVerificationRequest.mockResolvedValue(mockData)

      const { result } = renderHook(() => useEvidenceService())

      const data = await result.current.cancelVerificationRequest('verification-id')

      expect(mockEvidenceApi.cancelVerificationRequest).toHaveBeenCalledWith('verification-id')
      expect(mockUpdateVerificationRequest).toHaveBeenCalledWith(null, null)
      expect(data).toEqual(mockData)
    })

    it('should clear the verification request and return undefined without throwing when the request is already gone (404)', async () => {
      mockEvidenceApi.cancelVerificationRequest.mockRejectedValue(notFoundError)

      const { result } = renderHook(() => useEvidenceService())

      const data = await result.current.cancelVerificationRequest('verification-id')

      expect(mockEvidenceApi.cancelVerificationRequest).toHaveBeenCalledWith('verification-id')
      expect(mockUpdateVerificationRequest).toHaveBeenCalledWith(null, null)
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Verification request not found for ID: verification-id')
      )
      expect(mockServerErrorAlert).not.toHaveBeenCalled()
      expect(data).toBeUndefined()
    })

    it('should show an alert and rethrow the error for non-404 errors, without clearing the verification request', async () => {
      const mockError = mockAppError(AppEventCode.SERVER_ERROR)
      mockEvidenceApi.cancelVerificationRequest.mockRejectedValue(mockError)

      const { result } = renderHook(() => useEvidenceService())

      await expect(result.current.cancelVerificationRequest('verification-id')).rejects.toThrow(mockError)
      expect(mockEvidenceApi.cancelVerificationRequest).toHaveBeenCalledWith('verification-id')
      expect(mockServerErrorAlert).toHaveBeenCalledWith(mockError)
      expect(mockUpdateVerificationRequest).not.toHaveBeenCalled()
    })

    it('should rethrow non-AppErrors without showing an alert or clearing the verification request', async () => {
      const mockError = new Error('Unexpected failure')
      mockEvidenceApi.cancelVerificationRequest.mockRejectedValue(mockError)

      const { result } = renderHook(() => useEvidenceService())

      await expect(result.current.cancelVerificationRequest('verification-id')).rejects.toThrow(mockError)
      expect(mockServerErrorAlert).not.toHaveBeenCalled()
      expect(mockUpdateVerificationRequest).not.toHaveBeenCalled()
    })
  })

  it('should return a memoized cancelVerificationRequest function', () => {
    const { result, rerender } = renderHook(() => useEvidenceService())

    const firstCancelVerificationRequest = result.current.cancelVerificationRequest

    rerender(undefined)

    expect(result.current.cancelVerificationRequest).toBe(firstCancelVerificationRequest)
  })
})
