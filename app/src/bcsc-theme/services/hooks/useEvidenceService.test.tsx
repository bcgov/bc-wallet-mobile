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

jest.mock('@/bcsc-theme/api/hooks/useFactoryReset')

jest.mock('@/bcsc-theme/api/hooks/useEvidenceApi')
jest.mock('@/bcsc-theme/hooks/useBCSCApiClient')
jest.mock('@bifold/core', () => ({
  __esModule: true,
  TOKENS: { UTIL_LOGGER: 'UTIL_LOGGER' },
  useServices: jest.fn(),
}))
// Stubs navigationRef so this unit test doesn't load the real NavigationContainerContext.
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
    sendVerificationRequest: jest.fn(),
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

    it('should mark a surfaced error as handled so callers do not alert twice', async () => {
      const mockError = mockAppError(AppEventCode.SERVER_ERROR)
      mockEvidenceApi.getVerificationRequestStatus.mockRejectedValue(mockError)

      const { result } = renderHook(() => useEvidenceService())

      await expect(result.current.getVerificationRequestStatus('verification-id')).rejects.toThrow(mockError)
      expect(mockServerErrorAlert).toHaveBeenCalledWith(mockError)
      expect(mockError.handled).toBe(true)
    })
  })

  describe('sendVerificationRequest', () => {
    const payload = { upload_uris: ['photo-uri', 'video-uri'], sha256: 'sha-456' }
    const submitted = { id: 'verification-id', status: 'pending', avg_turnaround_time_message: 'within 2 days' }

    // Fresh instances per test: the service marks the errors it surfaces as handled
    const axiosAppError = (status: number, appEvent: AppEventCode, statusCode: number) =>
      new AppError(
        `HTTP ${status}`,
        { category: ErrorCategory.NETWORK, appEvent, statusCode },
        {
          cause: new AxiosError(`HTTP ${status}`, 'ERR_BAD_RESPONSE', undefined, undefined, { status } as any),
          track: false,
        }
      )
    const serverError = () => axiosAppError(500, AppEventCode.SERVER_ERROR, 2101)
    const conflictError = () => axiosAppError(409, AppEventCode.CONFLICT, 2114)
    const sessionExpiredError = () => axiosAppError(401, AppEventCode.ERR_210_UNAUTHORIZED, 2110)

    it('passes skipOnErrorHandler and returns the submit response', async () => {
      mockEvidenceApi.sendVerificationRequest.mockResolvedValue(submitted)

      const { result } = renderHook(() => useEvidenceService())

      const data = await result.current.sendVerificationRequest('verification-id', payload)

      expect(mockEvidenceApi.sendVerificationRequest).toHaveBeenCalledWith('verification-id', payload, {
        skipOnErrorHandler: true,
      })
      expect(mockEvidenceApi.getVerificationRequestStatus).not.toHaveBeenCalled()
      expect(data).toEqual(submitted)
    })

    it.each(['pending', 'verified', 'cancelled'])(
      'treats a 500 as submitted when the read-back finds the request %s',
      async (status) => {
        const readBack = { ...submitted, status }
        mockEvidenceApi.sendVerificationRequest.mockRejectedValue(serverError())
        mockEvidenceApi.getVerificationRequestStatus.mockResolvedValue(readBack)

        const { result } = renderHook(() => useEvidenceService())

        const data = await result.current.sendVerificationRequest('verification-id', payload)

        expect(mockEvidenceApi.getVerificationRequestStatus).toHaveBeenCalledWith('verification-id', {
          skipOnErrorHandler: true,
        })
        expect(data).toEqual(readBack)
        expect(mockServerErrorAlert).not.toHaveBeenCalled()
        expect(mockUnknownErrorModal).not.toHaveBeenCalled()
        expect(mockUpdateVerificationRequest).not.toHaveBeenCalled()
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining(`already ${status}`))
      }
    )

    it('surfaces the original 500 and keeps the stored request when the read-back finds no record (404)', async () => {
      const error = serverError()
      mockEvidenceApi.sendVerificationRequest.mockRejectedValue(error)
      mockEvidenceApi.getVerificationRequestStatus.mockRejectedValue(notFoundError)

      const { result } = renderHook(() => useEvidenceService())

      await expect(result.current.sendVerificationRequest('verification-id', payload)).rejects.toBe(error)
      expect(mockServerErrorAlert).toHaveBeenCalledWith(error)
      expect(error.handled).toBe(true)
      expect(mockUpdateVerificationRequest).not.toHaveBeenCalled()
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('failed; surfacing the original submit error'),
        expect.objectContaining({ error: notFoundError })
      )
    })

    it('surfaces the original 500 when the read-back itself fails', async () => {
      const error = serverError()
      mockEvidenceApi.sendVerificationRequest.mockRejectedValue(error)
      mockEvidenceApi.getVerificationRequestStatus.mockRejectedValue(serverError())

      const { result } = renderHook(() => useEvidenceService())

      await expect(result.current.sendVerificationRequest('verification-id', payload)).rejects.toBe(error)
      expect(mockServerErrorAlert).toHaveBeenCalledTimes(1)
      expect(mockServerErrorAlert).toHaveBeenCalledWith(error)
      expect(mockUpdateVerificationRequest).not.toHaveBeenCalled()
    })

    it('does not treat an unrecognised read-back status as submitted', async () => {
      const error = serverError()
      mockEvidenceApi.sendVerificationRequest.mockRejectedValue(error)
      mockEvidenceApi.getVerificationRequestStatus.mockResolvedValue({ id: 'verification-id', status: 'created' })

      const { result } = renderHook(() => useEvidenceService())

      await expect(result.current.sendVerificationRequest('verification-id', payload)).rejects.toBe(error)
      expect(mockServerErrorAlert).toHaveBeenCalledWith(error)
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('unrecognised status'))
    })

    it('rethrows a 409 without reading back or alerting, leaving it to the upload model', async () => {
      const error = conflictError()
      mockEvidenceApi.sendVerificationRequest.mockRejectedValue(error)

      const { result } = renderHook(() => useEvidenceService())

      await expect(result.current.sendVerificationRequest('verification-id', payload)).rejects.toBe(error)
      expect(mockEvidenceApi.getVerificationRequestStatus).not.toHaveBeenCalled()
      expect(mockServerErrorAlert).not.toHaveBeenCalled()
      expect(mockUnknownErrorModal).not.toHaveBeenCalled()
      expect(error.handled).toBe(false)
    })

    it('navigates to the VerificationSessionExpired modal for a 401 and marks it handled', async () => {
      const error = sessionExpiredError()
      mockEvidenceApi.sendVerificationRequest.mockRejectedValue(error)
      const navigation = useNavigation()

      const { result } = renderHook(() => useEvidenceService())

      await expect(result.current.sendVerificationRequest('verification-id', payload)).rejects.toBe(error)
      expect(navigation.dispatch).toHaveBeenCalledWith(
        CommonActions.navigate({ name: BCSCModals.VerificationSessionExpired })
      )
      expect(mockEvidenceApi.getVerificationRequestStatus).not.toHaveBeenCalled()
      expect(mockServerErrorAlert).not.toHaveBeenCalled()
      expect(error.handled).toBe(true)
    })

    it.each([AppEventCode.IOS_APP_UPDATE_REQUIRED, AppEventCode.ANDROID_APP_UPDATE_REQUIRED])(
      'shows the app update alert for %s and marks it handled',
      async (appEvent) => {
        const error = mockAppError(appEvent)
        mockEvidenceApi.sendVerificationRequest.mockRejectedValue(error)

        const { result } = renderHook(() => useEvidenceService())

        await expect(result.current.sendVerificationRequest('verification-id', payload)).rejects.toBe(error)
        expect(mockAppUpdateRequiredAlert).toHaveBeenCalled()
        expect(mockServerErrorAlert).not.toHaveBeenCalled()
        expect(error.handled).toBe(true)
      }
    )

    it('shows the server error alert for a server failure that is not a 500, without reading back', async () => {
      const error = mockAppError(AppEventCode.SERVER_ERROR)
      mockEvidenceApi.sendVerificationRequest.mockRejectedValue(error)

      const { result } = renderHook(() => useEvidenceService())

      await expect(result.current.sendVerificationRequest('verification-id', payload)).rejects.toBe(error)
      expect(mockEvidenceApi.getVerificationRequestStatus).not.toHaveBeenCalled()
      expect(mockServerErrorAlert).toHaveBeenCalledWith(error)
      expect(error.handled).toBe(true)
    })

    it('rethrows a dropped connection unhandled so the upload model can show its connection copy', async () => {
      const error = mockAppError(AppEventCode.NO_INTERNET)
      mockEvidenceApi.sendVerificationRequest.mockRejectedValue(error)

      const { result } = renderHook(() => useEvidenceService())

      await expect(result.current.sendVerificationRequest('verification-id', payload)).rejects.toBe(error)
      expect(mockServerErrorAlert).not.toHaveBeenCalled()
      expect(mockUnknownErrorModal).not.toHaveBeenCalled()
      expect(error.handled).toBe(false)
    })

    it('rethrows a non-AppError untouched without alerting', async () => {
      const error = new Error('boom')
      mockEvidenceApi.sendVerificationRequest.mockRejectedValue(error)

      const { result } = renderHook(() => useEvidenceService())

      await expect(result.current.sendVerificationRequest('verification-id', payload)).rejects.toBe(error)
      expect(mockUnknownErrorModal).not.toHaveBeenCalled()
      expect(mockServerErrorAlert).not.toHaveBeenCalled()
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

  it('should return a memoized sendVerificationRequest function', () => {
    const { result, rerender } = renderHook(() => useEvidenceService())

    const firstSendVerificationRequest = result.current.sendVerificationRequest

    rerender(undefined)

    expect(result.current.sendVerificationRequest).toBe(firstSendVerificationRequest)
  })
})
