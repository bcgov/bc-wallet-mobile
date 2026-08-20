import useEvidenceApi from '@/bcsc-theme/api/hooks/useEvidenceApi'
import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { BCSCModals } from '@/bcsc-theme/types/navigators'
import { AppError, ErrorCategory } from '@/errors'
import { AppEventCode } from '@/events/appEventCode'
import * as Bifold from '@bifold/core'
import { mockAppError } from '@mocks/helpers/error'
import { CommonActions, useNavigation } from '@react-navigation/native'
import { renderHook } from '@testing-library/react-native'
import { AxiosError } from 'axios'
import { useEvidenceService } from './useEvidenceService'

jest.mock('@/bcsc-theme/api/hooks/useEvidenceApi')
jest.mock('@/bcsc-theme/hooks/useBCSCApiClient')
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
const mockUnknownErrorModal = jest.fn()
const mockAppUpdateRequiredAlert = jest.fn()
const mockAlerts = {
  serverErrorAlert: mockServerErrorAlert,
  unknownErrorModal: mockUnknownErrorModal,
  appUpdateRequiredAlert: mockAppUpdateRequiredAlert,
}
jest.mock('@/hooks/useAlerts', () => ({
  ...jest.requireActual('@/hooks/useAlerts'),
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

const unauthorizedError = new AppError(
  'Unauthorized',
  { category: ErrorCategory.NETWORK, appEvent: AppEventCode.ERR_210_UNAUTHORIZED, statusCode: 2110 },
  {
    cause: new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', undefined, undefined, { status: 401 } as any),
    track: false,
  }
)

describe('useEvidenceService', () => {
  const mockEvidenceApi = {
    cancelVerificationRequest: jest.fn(),
    getVerificationRequestStatus: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdateVerificationRequest.mockResolvedValue(undefined)

    jest.mocked(Bifold).useServices.mockReturnValue([mockLogger] as any)
    jest.mocked(useBCSCApiClientState).mockReturnValue({ client: {} as any, isClientReady: true, error: null })
    jest.mocked(useEvidenceApi).mockReturnValue(mockEvidenceApi as any)
  })

  describe('cancelVerificationRequest', () => {
    it('should call evidenceApi.cancelVerificationRequest, clear the verification request, and return data', async () => {
      const mockData = { status: 'cancelled' }
      mockEvidenceApi.cancelVerificationRequest.mockResolvedValue(mockData)

      const { result } = renderHook(() => useEvidenceService())

      const data = await result.current.cancelVerificationRequest('verification-id')

      expect(mockEvidenceApi.cancelVerificationRequest).toHaveBeenCalledWith('verification-id')
      expect(mockUpdateVerificationRequest).toHaveBeenCalledWith(undefined, null)
      expect(data).toEqual(mockData)
    })

    it('should clear the verification request and return undefined without throwing when the request is already gone (404)', async () => {
      mockEvidenceApi.cancelVerificationRequest.mockRejectedValue(notFoundError)

      const { result } = renderHook(() => useEvidenceService())

      const data = await result.current.cancelVerificationRequest('verification-id')

      expect(mockEvidenceApi.cancelVerificationRequest).toHaveBeenCalledWith('verification-id')
      expect(mockUpdateVerificationRequest).toHaveBeenCalledWith(undefined, null)
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

    it('should rethrow non-AppErrors, showing the generic unknown error modal, without clearing the verification request', async () => {
      const mockError = new Error('Unexpected failure')
      mockEvidenceApi.cancelVerificationRequest.mockRejectedValue(mockError)

      const { result } = renderHook(() => useEvidenceService())

      await expect(result.current.cancelVerificationRequest('verification-id')).rejects.toThrow(mockError)
      expect(mockServerErrorAlert).not.toHaveBeenCalled()
      expect(mockUnknownErrorModal).toHaveBeenCalledWith(mockError)
      expect(mockUpdateVerificationRequest).not.toHaveBeenCalled()
    })

    it('should navigate to the VerificationSessionExpired modal for a 401 error, without showing an alert', async () => {
      mockEvidenceApi.cancelVerificationRequest.mockRejectedValue(unauthorizedError)
      const navigation = useNavigation()

      const { result } = renderHook(() => useEvidenceService())

      await expect(result.current.cancelVerificationRequest('verification-id')).rejects.toThrow(unauthorizedError)
      expect(navigation.dispatch).toHaveBeenCalledWith(
        CommonActions.navigate({ name: BCSCModals.VerificationSessionExpired })
      )
      expect(mockServerErrorAlert).not.toHaveBeenCalled()
      expect(mockUnknownErrorModal).not.toHaveBeenCalled()
      expect(mockUpdateVerificationRequest).not.toHaveBeenCalled()
    })

    it('should show the app update alert for an iOS app-update-required error', async () => {
      const mockError = mockAppError(AppEventCode.IOS_APP_UPDATE_REQUIRED)
      mockEvidenceApi.cancelVerificationRequest.mockRejectedValue(mockError)

      const { result } = renderHook(() => useEvidenceService())

      await expect(result.current.cancelVerificationRequest('verification-id')).rejects.toThrow(mockError)
      expect(mockAppUpdateRequiredAlert).toHaveBeenCalled()
      expect(mockServerErrorAlert).not.toHaveBeenCalled()
    })

    it('should show the app update alert for an Android app-update-required error', async () => {
      const mockError = mockAppError(AppEventCode.ANDROID_APP_UPDATE_REQUIRED)
      mockEvidenceApi.cancelVerificationRequest.mockRejectedValue(mockError)

      const { result } = renderHook(() => useEvidenceService())

      await expect(result.current.cancelVerificationRequest('verification-id')).rejects.toThrow(mockError)
      expect(mockAppUpdateRequiredAlert).toHaveBeenCalled()
      expect(mockServerErrorAlert).not.toHaveBeenCalled()
    })
  })

  describe('getVerificationRequestStatus', () => {
    it('should call evidenceApi.getVerificationRequestStatus with skipOnErrorHandler and return the data', async () => {
      const mockData = { id: 'verification-id', status: 'verified' }
      mockEvidenceApi.getVerificationRequestStatus.mockResolvedValue(mockData)

      const { result } = renderHook(() => useEvidenceService())

      const data = await result.current.getVerificationRequestStatus('verification-id')

      expect(mockEvidenceApi.getVerificationRequestStatus).toHaveBeenCalledWith('verification-id', {
        skipOnErrorHandler: true,
      })
      expect(data).toEqual(mockData)
    })

    it('should clear the verification request and return a cancelled status when the request is not found (404)', async () => {
      mockEvidenceApi.getVerificationRequestStatus.mockRejectedValue(notFoundError)

      const { result } = renderHook(() => useEvidenceService())

      const data = await result.current.getVerificationRequestStatus('verification-id')

      expect(mockUpdateVerificationRequest).toHaveBeenCalledWith(undefined, null)
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Verification request not found for ID: verification-id')
      )
      expect(mockServerErrorAlert).not.toHaveBeenCalled()
      expect(data).toEqual({ id: 'verification-id', status: 'cancelled' })
    })

    it('should show an alert and rethrow the error for non-404 errors', async () => {
      const mockError = mockAppError(AppEventCode.SERVER_ERROR)
      mockEvidenceApi.getVerificationRequestStatus.mockRejectedValue(mockError)

      const { result } = renderHook(() => useEvidenceService())

      await expect(result.current.getVerificationRequestStatus('verification-id')).rejects.toThrow(mockError)
      expect(mockServerErrorAlert).toHaveBeenCalledWith(mockError)
      expect(mockUpdateVerificationRequest).not.toHaveBeenCalled()
    })

    it('should navigate to the VerificationSessionExpired modal for a 401 error', async () => {
      mockEvidenceApi.getVerificationRequestStatus.mockRejectedValue(unauthorizedError)
      const navigation = useNavigation()

      const { result } = renderHook(() => useEvidenceService())

      await expect(result.current.getVerificationRequestStatus('verification-id')).rejects.toThrow(unauthorizedError)
      expect(navigation.dispatch).toHaveBeenCalledWith(
        CommonActions.navigate({ name: BCSCModals.VerificationSessionExpired })
      )
    })
  })

  it('should return a memoized cancelVerificationRequest function', () => {
    const { result, rerender } = renderHook(() => useEvidenceService())

    const firstCancelVerificationRequest = result.current.cancelVerificationRequest

    rerender(undefined)

    expect(result.current.cancelVerificationRequest).toBe(firstCancelVerificationRequest)
  })

  it('should return a memoized getVerificationRequestStatus function', () => {
    const { result, rerender } = renderHook(() => useEvidenceService())

    const firstGetVerificationRequestStatus = result.current.getVerificationRequestStatus

    rerender(undefined)

    expect(result.current.getVerificationRequestStatus).toBe(firstGetVerificationRequestStatus)
  })
})
