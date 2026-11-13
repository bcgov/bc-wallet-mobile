import useApi from '@/bcsc-theme/api/hooks/useApi'
import { DeviceAuthorizationError } from '@/bcsc-theme/features/verify/deviceAuthorizationError'
import { useAuthorizationService } from '@/bcsc-theme/services/hooks/useAuthorizationService'
import { RateLimitedAction, RateLimitWaitType } from '@/bcsc-theme/state/rate-limit/rate-limit'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { AppError, ErrorCategory } from '@/errors'
import { AppEventCode } from '@/events/appEventCode'
import { CommonActions } from '@react-navigation/native'
import { renderHook } from '@testing-library/react-native'

jest.mock('@/bcsc-theme/api/hooks/useApi')

jest.mock('@bifold/core', () => ({
  __esModule: true,
  TOKENS: { UTIL_LOGGER: 'UTIL_LOGGER' },
  useServices: jest.fn(),
}))

const mockNavigate = jest.fn()
const mockDispatch = jest.fn()
const mockNavigation = { navigate: mockNavigate, dispatch: mockDispatch }
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}))

const mockServerErrorAlert = jest.fn()
const mockForbiddenAlert = jest.fn()
const mockAlerts = {
  serverErrorAlert: mockServerErrorAlert,
  forbiddenAlert: mockForbiddenAlert,
}
jest.mock('@/hooks/useAlerts', () => ({
  useAlerts: () => mockAlerts,
}))

const mockGetWait = jest.fn()
const mockRecordRateLimit = jest.fn()
jest.mock('./useRateLimit', () => ({
  useRateLimit: () => ({ getWait: mockGetWait, recordRateLimit: mockRecordRateLimit }),
}))

jest.mock('@/contexts/NavigationContainerContext', () => ({
  navigationRef: { isReady: () => false, getCurrentRoute: () => undefined },
}))

const buildError = (technicalMessage: string, appEvent: AppEventCode = AppEventCode.UNKNOWN_SERVER_ERROR): AppError =>
  new AppError(
    'Device authorization failed',
    { category: ErrorCategory.GENERAL, appEvent, statusCode: 5000 },
    { cause: new Error(technicalMessage), track: false }
  )

describe('useAuthorizationService', () => {
  const mockAuthorizeDevice = jest.fn()
  const mockAuthorizeDeviceWithUnknownBCSC = jest.fn()
  const mockAuthorizeDeviceWithBarcodes = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetWait.mockReturnValue({ type: RateLimitWaitType.None })
    jest.mocked(useApi).mockReturnValue({
      authorization: {
        authorizeDevice: mockAuthorizeDevice,
        authorizeDeviceWithUnknownBCSC: mockAuthorizeDeviceWithUnknownBCSC,
        authorizeDeviceWithBarcodes: mockAuthorizeDeviceWithBarcodes,
      },
    } as any)
  })

  describe('authorizeDevice', () => {
    it('returns the response on success without navigating', async () => {
      const mockResponse = { device_code: 'abc' }
      mockAuthorizeDevice.mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useAuthorizationService())
      const response = await result.current.authorizeDevice('12345', new Date('1990-01-01'))

      expect(response).toEqual(mockResponse)
      expect(mockAuthorizeDevice).toHaveBeenCalledWith('12345', new Date('1990-01-01'))
      expect(mockNavigate).not.toHaveBeenCalled()
    })

    describe('card add rate limit', () => {
      const waiting = { type: RateLimitWaitType.Waiting, retryAt: new Date(), minutes: 5 }
      const birthdate = new Date('1990-01-01')

      it('sends no request, resets to the lockout screen and rejects with a handled RETRY_LATER while waiting', async () => {
        mockGetWait.mockReturnValue(waiting)
        const { result } = renderHook(() => useAuthorizationService())

        const rejection = await result.current.authorizeDevice('12345', birthdate).catch((e) => e)

        expect(rejection).toBeInstanceOf(AppError)
        expect(rejection.appEvent).toBe(AppEventCode.ERR_212_RETRY_LATER)
        expect(rejection.handled).toBe(true)
        expect(mockGetWait).toHaveBeenCalledWith(RateLimitedAction.CardAdd)
        expect(mockAuthorizeDevice).not.toHaveBeenCalled()
        expect(mockDispatch).toHaveBeenCalledTimes(1)
        expect(CommonActions.reset).toHaveBeenCalledWith({
          index: 1,
          routes: [{ name: BCSCScreens.IdentitySelection }, { name: BCSCScreens.BirthdateLockout }],
        })
      })

      it('rejects without navigating or marking handled when skipErrorHandling is set', async () => {
        mockGetWait.mockReturnValue(waiting)
        const { result } = renderHook(() => useAuthorizationService())

        const rejection = await result.current
          .authorizeDevice('12345', birthdate, { skipErrorHandling: true })
          .catch((e) => e)

        expect(rejection.appEvent).toBe(AppEventCode.ERR_212_RETRY_LATER)
        expect(rejection.handled).toBe(false)
        expect(mockAuthorizeDevice).not.toHaveBeenCalled()
        expect(mockDispatch).not.toHaveBeenCalled()
      })

      it.each([
        ['no arguments (QR transfer)', [undefined, undefined]],
        ['a serial without a birthdate', ['12345', undefined]],
      ])('is never guarded or recorded for %s', async (_label, args) => {
        mockGetWait.mockReturnValue(waiting)
        mockAuthorizeDevice.mockResolvedValue({ device_code: 'abc' })
        const { result } = renderHook(() => useAuthorizationService())

        await result.current.authorizeDevice(...(args as [string?, Date?]))

        expect(mockAuthorizeDevice).toHaveBeenCalled()
        expect(mockGetWait).not.toHaveBeenCalled()
        expect(mockRecordRateLimit).not.toHaveBeenCalled()
      })

      it('records a failure from a card add on both the normal and skipErrorHandling paths', async () => {
        const error = buildError('too many attempts')
        mockAuthorizeDevice.mockRejectedValue(error)
        const { result } = renderHook(() => useAuthorizationService())

        await expect(result.current.authorizeDevice('12345', birthdate)).rejects.toThrow(error)
        await expect(result.current.authorizeDevice('12345', birthdate, { skipErrorHandling: true })).rejects.toThrow(
          error
        )

        expect(mockRecordRateLimit).toHaveBeenCalledTimes(2)
        expect(mockRecordRateLimit).toHaveBeenCalledWith(RateLimitedAction.CardAdd, error)
      })

      it('does not guard or record the unknown-BCSC and barcode calls', async () => {
        mockGetWait.mockReturnValue(waiting)
        mockAuthorizeDeviceWithUnknownBCSC.mockRejectedValue(buildError('x'))
        mockAuthorizeDeviceWithBarcodes.mockRejectedValue(buildError('x'))
        const { result } = renderHook(() => useAuthorizationService())

        await result.current.authorizeDeviceWithUnknownBCSC({} as never, { skipErrorHandling: true }).catch(() => {})
        await result.current.authorizeDeviceWithBarcodes([], { skipErrorHandling: true }).catch(() => {})

        expect(mockAuthorizeDeviceWithUnknownBCSC).toHaveBeenCalled()
        expect(mockAuthorizeDeviceWithBarcodes).toHaveBeenCalled()
        expect(mockRecordRateLimit).not.toHaveBeenCalled()
      })
    })

    it('rethrows without navigating or marking handled when skipErrorHandling is set', async () => {
      const error = buildError('card_not_found', AppEventCode.CARD_NOT_FOUND)
      mockAuthorizeDevice.mockRejectedValue(error)

      const { result } = renderHook(() => useAuthorizationService())

      await expect(
        result.current.authorizeDevice('12345', new Date('1990-01-01'), { skipErrorHandling: true })
      ).rejects.toThrow(error)
      expect(mockNavigate).not.toHaveBeenCalled()
      expect(error.handled).toBe(false)
    })

    it('routes card_not_found to VerificationCardError as MismatchedSerial and marks the error handled', async () => {
      const error = buildError('card_not_found', AppEventCode.CARD_NOT_FOUND)
      mockAuthorizeDevice.mockRejectedValue(error)

      const { result } = renderHook(() => useAuthorizationService())

      await expect(result.current.authorizeDevice('12345', new Date('1990-01-01'))).rejects.toThrow(error)
      expect(mockNavigate).toHaveBeenCalledWith(BCSCScreens.VerificationCardError, {
        errorType: DeviceAuthorizationError.MismatchedSerial,
      })
      expect(error.handled).toBe(true)
    })

    it('routes invalid_parameter to VerificationCardError as InvalidParameter', async () => {
      const error = buildError('invalid_parameter', AppEventCode.INVALID_PARAMETER)
      mockAuthorizeDevice.mockRejectedValue(error)

      const { result } = renderHook(() => useAuthorizationService())

      await expect(result.current.authorizeDevice()).rejects.toThrow(error)
      expect(mockNavigate).toHaveBeenCalledWith(BCSCScreens.VerificationCardError, {
        errorType: DeviceAuthorizationError.InvalidParameter,
      })
      expect(error.handled).toBe(true)
    })

    it('routes card_expired to VerificationCardError as CardExpired', async () => {
      const error = buildError('card_expired', AppEventCode.CARD_EXPIRED)
      mockAuthorizeDevice.mockRejectedValue(error)

      const { result } = renderHook(() => useAuthorizationService())

      await expect(result.current.authorizeDevice()).rejects.toThrow(error)
      expect(mockNavigate).toHaveBeenCalledWith(BCSCScreens.VerificationCardError, {
        errorType: DeviceAuthorizationError.CardExpired,
      })
      expect(error.handled).toBe(true)
    })
  })

  describe('generic DeviceAuthorizationError routing (shared by all three authorize* calls)', () => {
    const cases: Array<[string, AppEventCode, DeviceAuthorizationError]> = [
      ['card_inactive', AppEventCode.CARD_INACTIVE, DeviceAuthorizationError.CardInactive],
      ['card_replaced', AppEventCode.CARD_REPLACED, DeviceAuthorizationError.CardReplaced],
      ['card_cancelled', AppEventCode.CARD_CANCELLED, DeviceAuthorizationError.CardCancelled],
      ['card_renewed', AppEventCode.CARD_RENEWED, DeviceAuthorizationError.CardRenewed],
      ['card_problem', AppEventCode.CARD_PROBLEM, DeviceAuthorizationError.CardProblem],
      ['additional_card', AppEventCode.ADDITIONAL_CARD, DeviceAuthorizationError.AdditionalCard],
      ['under_minimum_age', AppEventCode.UNDER_MINIMUM_AGE, DeviceAuthorizationError.UnderMinimumAge],
      ['over_maximum_age', AppEventCode.OVER_MAXIMUM_AGE, DeviceAuthorizationError.OverMaximumAge],
      ['too_many_mobile_cards', AppEventCode.TOO_MANY_MOBILE_CARDS, DeviceAuthorizationError.TooManyMobileCards],
    ]

    it.each(cases)(
      'routes %s to the generic DeviceAuthorizationError screen',
      async (technicalMessage, appEvent, errorType) => {
        const error = buildError(technicalMessage, appEvent)
        mockAuthorizeDeviceWithUnknownBCSC.mockRejectedValue(error)

        const { result } = renderHook(() => useAuthorizationService())

        await expect(result.current.authorizeDeviceWithUnknownBCSC({} as any)).rejects.toThrow(error)
        expect(mockNavigate).toHaveBeenCalledWith(BCSCScreens.DeviceAuthorizationError, { errorType })
        expect(error.handled).toBe(true)
      }
    )
  })

  describe('alert fallback', () => {
    it('emits the matching global alert and does not mark the error handled', async () => {
      const error = buildError('some unrelated server failure', AppEventCode.SERVER_ERROR)
      mockAuthorizeDeviceWithBarcodes.mockRejectedValue(error)

      const { result } = renderHook(() => useAuthorizationService())

      await expect(result.current.authorizeDeviceWithBarcodes([])).rejects.toThrow(error)
      expect(mockServerErrorAlert).toHaveBeenCalledWith(error)
      expect(mockNavigate).not.toHaveBeenCalled()
      expect(error.handled).toBe(false)
    })

    it('does nothing when neither a screen nor a global alert matches', async () => {
      const error = buildError('totally unmapped reason', AppEventCode.UNKNOWN_SERVER_ERROR)
      mockAuthorizeDeviceWithBarcodes.mockRejectedValue(error)

      const { result } = renderHook(() => useAuthorizationService())

      await expect(result.current.authorizeDeviceWithBarcodes([])).rejects.toThrow(error)
      expect(mockNavigate).not.toHaveBeenCalled()
      expect(mockServerErrorAlert).not.toHaveBeenCalled()
      expect(mockForbiddenAlert).not.toHaveBeenCalled()
      expect(error.handled).toBe(false)
    })
  })

  describe('already-handled and non-AppError passthrough', () => {
    it('does not re-navigate or re-alert when the error is already handled', async () => {
      const error = buildError('card_not_found', AppEventCode.CARD_NOT_FOUND)
      error.handled = true
      mockAuthorizeDevice.mockRejectedValue(error)

      const { result } = renderHook(() => useAuthorizationService())

      await expect(result.current.authorizeDevice()).rejects.toThrow(error)
      expect(mockNavigate).not.toHaveBeenCalled()
      expect(mockServerErrorAlert).not.toHaveBeenCalled()
    })

    it('rethrows non-AppErrors untouched without navigating or alerting', async () => {
      const error = new Error('native failure')
      mockAuthorizeDevice.mockRejectedValue(error)

      const { result } = renderHook(() => useAuthorizationService())

      await expect(result.current.authorizeDevice()).rejects.toThrow(error)
      expect(mockNavigate).not.toHaveBeenCalled()
      expect(mockServerErrorAlert).not.toHaveBeenCalled()
    })
  })

  describe('authorizeDeviceWithUnknownBCSC / authorizeDeviceWithBarcodes success', () => {
    it('authorizeDeviceWithUnknownBCSC returns the response on success without navigating', async () => {
      const mockResponse = { device_code: 'unknown-bcsc' }
      mockAuthorizeDeviceWithUnknownBCSC.mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useAuthorizationService())
      const config = { firstName: 'Jane', lastName: 'Doe', birthdate: '1990-01-01', address: {} } as any
      const response = await result.current.authorizeDeviceWithUnknownBCSC(config)

      expect(response).toEqual(mockResponse)
      expect(mockAuthorizeDeviceWithUnknownBCSC).toHaveBeenCalledWith(config)
      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('authorizeDeviceWithBarcodes returns the response on success without navigating', async () => {
      const mockResponse = { device_code: 'barcodes' }
      mockAuthorizeDeviceWithBarcodes.mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useAuthorizationService())
      const response = await result.current.authorizeDeviceWithBarcodes([])

      expect(response).toEqual(mockResponse)
      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('authorizeDeviceWithBarcodes rethrows without navigating when skipErrorHandling is set', async () => {
      const error = buildError('card_not_found', AppEventCode.CARD_NOT_FOUND)
      mockAuthorizeDeviceWithBarcodes.mockRejectedValue(error)

      const { result } = renderHook(() => useAuthorizationService())

      await expect(result.current.authorizeDeviceWithBarcodes([], { skipErrorHandling: true })).rejects.toThrow(error)
      expect(mockNavigate).not.toHaveBeenCalled()
      expect(error.handled).toBe(false)
    })
  })

  describe('memoization', () => {
    it('returns stable function references across re-renders when dependencies are unchanged', () => {
      const { result, rerender } = renderHook(() => useAuthorizationService())

      const first = result.current.authorizeDevice

      rerender(undefined)

      expect(result.current.authorizeDevice).toBe(first)
    })
  })
})
