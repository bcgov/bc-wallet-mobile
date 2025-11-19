import { BCSCModals } from '@/bcsc-theme/types/navigators'
import { NETWORK_ERROR_CODE, NETWORK_ERROR_MESSAGE } from '@/bcsc-theme/utils/error-utils'
import { BCSCEvent, BCSCReason, IdToken } from '@/bcsc-theme/utils/id-token'
import { DeviceInvalidatedSystemCheck } from '@/services/system-checks/DeviceInvalidatedSystemCheck'
import { SystemCheckNavigation, SystemCheckUtils } from '@/services/system-checks/system-checks'
import { AxiosError } from 'axios'

describe('DeviceInvalidatedSystemCheck', () => {
  let mockNavigation: SystemCheckNavigation
  let mockUtils: SystemCheckUtils

  const createMockIdToken = (overrides?: Partial<IdToken>): IdToken => ({
    sub: 'test-sub',
    aud: 'test-aud',
    iss: 'test-iss',
    exp: 1234567890,
    iat: '1234567890',
    jti: 'test-jti',
    family_name: 'Test',
    given_name: 'User',
    bcsc_card_type: 'Combined' as any,
    bcsc_event: BCSCEvent.Authorization,
    bcsc_reason: BCSCReason.ApprovedByAgent,
    bcsc_status_date: 1234567890,
    acr: 0,
    bcsc_devices_count: 1,
    bcsc_max_devices: 5,
    hasActivePersonCredential: true,
    bcsc_account_type: 'BC Services Card with photo' as any,
    ...overrides,
  })

  beforeEach(() => {
    jest.resetAllMocks()

    mockNavigation = {
      getState: jest.fn().mockReturnValue({
        routes: [{ name: 'Home' }],
        index: 0,
      }),
      navigate: jest.fn(),
      canGoBack: jest.fn().mockReturnValue(false),
      goBack: jest.fn(),
    } as any

    mockUtils = {
      dispatch: jest.fn(),
      translation: jest.fn(),
      logger: {
        error: jest.fn(),
        warn: jest.fn(),
      } as any,
    }
  })

  describe('runCheck', () => {
    it('should return false when device is invalidated (Cancel event with CanceledByAgent reason)', async () => {
      const mockIdToken = createMockIdToken({
        bcsc_event: BCSCEvent.Cancel,
        bcsc_reason: BCSCReason.CanceledByAgent,
      })
      const getIdToken = jest.fn().mockResolvedValue(mockIdToken)

      const check = new DeviceInvalidatedSystemCheck(getIdToken, mockNavigation, mockUtils)

      const result = await check.runCheck()

      expect(result).toBe(false)
      expect(getIdToken).toHaveBeenCalledTimes(1)
    })

    it('should return true when device is not invalidated (different event)', async () => {
      const mockIdToken = createMockIdToken({
        bcsc_event: BCSCEvent.Authorization,
        bcsc_reason: BCSCReason.ApprovedByAgent,
      })
      const getIdToken = jest.fn().mockResolvedValue(mockIdToken)

      const check = new DeviceInvalidatedSystemCheck(getIdToken, mockNavigation, mockUtils)

      const result = await check.runCheck()

      expect(result).toBe(true)
      expect(getIdToken).toHaveBeenCalledTimes(1)
    })

    it('should return true when device is not invalidated (Cancel event with different reason)', async () => {
      const mockIdToken = createMockIdToken({
        bcsc_event: BCSCEvent.Cancel,
        bcsc_reason: BCSCReason.CanceledByUser,
      })
      const getIdToken = jest.fn().mockResolvedValue(mockIdToken)

      const check = new DeviceInvalidatedSystemCheck(getIdToken, mockNavigation, mockUtils)

      const result = await check.runCheck()

      expect(result).toBe(true)
      expect(getIdToken).toHaveBeenCalledTimes(1)
    })

    it('should return true when network error occurs', async () => {
      const networkError = new AxiosError(NETWORK_ERROR_MESSAGE)
      networkError.code = NETWORK_ERROR_CODE
      ;(networkError as any).isNetworkError = true
      const getIdToken = jest.fn().mockRejectedValue(networkError)

      const check = new DeviceInvalidatedSystemCheck(getIdToken, mockNavigation, mockUtils)

      const result = await check.runCheck()

      expect(result).toBe(true)
      expect(getIdToken).toHaveBeenCalledTimes(1)
      expect(mockUtils.logger.error).toHaveBeenCalledWith(
        'DeviceInvalidatedSystemCheck: Id token request failed',
        networkError
      )
    })

    it('should return false when non-network error occurs', async () => {
      const nonNetworkError = new Error('Some other error')
      const getIdToken = jest.fn().mockRejectedValue(nonNetworkError)

      const check = new DeviceInvalidatedSystemCheck(getIdToken, mockNavigation, mockUtils)

      const result = await check.runCheck()

      expect(result).toBe(false)
      expect(getIdToken).toHaveBeenCalledTimes(1)
      expect(mockUtils.logger.error).toHaveBeenCalledWith(
        'DeviceInvalidatedSystemCheck: Id token request failed',
        nonNetworkError
      )
    })
  })

  describe('onFail', () => {
    it('should navigate to DeviceInvalidated modal when not already visible', () => {
      mockNavigation.getState = jest.fn().mockReturnValue({
        routes: [{ name: 'Home' }],
        index: 0,
      })
      const getIdToken = jest.fn()

      const check = new DeviceInvalidatedSystemCheck(getIdToken, mockNavigation, mockUtils)

      check.onFail()

      expect(mockUtils.logger.warn).toHaveBeenCalledWith('DeviceInvalidatedSystemCheck: Device invalidated')
      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCModals.DeviceInvalidated)
    })

    it('should not navigate when modal is already visible', () => {
      mockNavigation.getState = jest.fn().mockReturnValue({
        routes: [{ name: BCSCModals.DeviceInvalidated }],
        index: 0,
      })
      const getIdToken = jest.fn()

      const check = new DeviceInvalidatedSystemCheck(getIdToken, mockNavigation, mockUtils)

      check.onFail()

      expect(mockUtils.logger.warn).toHaveBeenCalledWith('DeviceInvalidatedSystemCheck: Device invalidated')
      expect(mockNavigation.navigate).not.toHaveBeenCalled()
    })
  })

  describe('onSuccess', () => {
    it('should go back when modal is visible and canGoBack returns true', () => {
      mockNavigation.getState = jest.fn().mockReturnValue({
        routes: [{ name: BCSCModals.DeviceInvalidated }],
        index: 0,
      })
      mockNavigation.canGoBack = jest.fn().mockReturnValue(true)
      const getIdToken = jest.fn()

      const check = new DeviceInvalidatedSystemCheck(getIdToken, mockNavigation, mockUtils)

      check.onSuccess()

      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1)
    })

    it('should not go back when modal is not visible', () => {
      mockNavigation.getState = jest.fn().mockReturnValue({
        routes: [{ name: 'Home' }],
        index: 0,
      })
      mockNavigation.canGoBack = jest.fn().mockReturnValue(true)
      const getIdToken = jest.fn()

      const check = new DeviceInvalidatedSystemCheck(getIdToken, mockNavigation, mockUtils)

      check.onSuccess()

      expect(mockNavigation.goBack).not.toHaveBeenCalled()
    })

    it('should not go back when canGoBack returns false', () => {
      mockNavigation.getState = jest.fn().mockReturnValue({
        routes: [{ name: BCSCModals.DeviceInvalidated }],
        index: 0,
      })
      mockNavigation.canGoBack = jest.fn().mockReturnValue(false)
      const getIdToken = jest.fn()

      const check = new DeviceInvalidatedSystemCheck(getIdToken, mockNavigation, mockUtils)

      check.onSuccess()

      expect(mockNavigation.goBack).not.toHaveBeenCalled()
    })
  })
})
