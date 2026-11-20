import { resetBCSCStore, seedBCSCStore } from '@/bcsc-theme/storage/testing'
import { AppEventCode } from '@/events/appEventCode'
import { UpdateDeviceRegistrationSystemCheck } from '@/services/system-checks/UpdateDeviceRegistrationSystemCheck'
import { MockLogger } from '@bifold/core'
import { mockAppError } from '@mocks/helpers/error'
import deviceInfo from 'react-native-device-info'

describe('UpdateDeviceRegistrationSystemCheck', () => {
  // The registered app version is saved to the app slice of the BCSC store
  const mockUpdateApp = jest.fn().mockResolvedValue(undefined)
  beforeEach(() => {
    resetBCSCStore()
    seedBCSCStore({ app: { update: mockUpdateApp } })
  })

  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })
  describe('runCheck', () => {
    it('should return true when app version and build number are the same', async () => {
      const mockUtils = {
        translation: jest.fn() as any,
        logger: new MockLogger(),
      }
      const updateRegistrationMock = jest.fn()

      jest.spyOn(deviceInfo, 'getVersion').mockReturnValue('1.0.0')
      jest.spyOn(deviceInfo, 'getBuildNumber').mockReturnValue('100')

      const systemCheck = new UpdateDeviceRegistrationSystemCheck('1.0.0', '100', updateRegistrationMock, mockUtils)

      const result = systemCheck.runCheck()

      expect(result).toBe(true)
    })

    it('should return false when app version is different', async () => {
      const mockUtils = {
        translation: jest.fn() as any,
        logger: new MockLogger(),
      }
      const updateRegistrationMock = jest.fn()

      jest.spyOn(deviceInfo, 'getVersion').mockReturnValue('1.0.1')
      jest.spyOn(deviceInfo, 'getBuildNumber').mockReturnValue('100')

      const systemCheck = new UpdateDeviceRegistrationSystemCheck('1.0.0', '100', updateRegistrationMock, mockUtils)

      const result = systemCheck.runCheck()

      expect(result).toBe(false)
    })

    it('should return false when build number is different', async () => {
      const mockUtils = {
        translation: jest.fn() as any,
        logger: new MockLogger(),
      }
      const updateRegistrationMock = jest.fn()

      jest.spyOn(deviceInfo, 'getVersion').mockReturnValue('1.0.0')
      jest.spyOn(deviceInfo, 'getBuildNumber').mockReturnValue('200')

      const systemCheck = new UpdateDeviceRegistrationSystemCheck('1.0.0', '100', updateRegistrationMock, mockUtils)

      const result = systemCheck.runCheck()

      expect(result).toBe(false)
    })

    it('should return false when stored version is blank (v3→v4 upgrade)', async () => {
      const mockUtils = {
        translation: jest.fn() as any,
        logger: new MockLogger(),
      }
      const updateRegistrationMock = jest.fn()

      jest.spyOn(deviceInfo, 'getVersion').mockReturnValue('4.0.0')
      jest.spyOn(deviceInfo, 'getBuildNumber').mockReturnValue('5937')

      const systemCheck = new UpdateDeviceRegistrationSystemCheck('', '', updateRegistrationMock, mockUtils)

      const result = systemCheck.runCheck()

      expect(result).toBe(false)
    })

    it('should return false when stored build number is blank', async () => {
      const mockUtils = {
        translation: jest.fn() as any,
        logger: new MockLogger(),
      }
      const updateRegistrationMock = jest.fn()

      jest.spyOn(deviceInfo, 'getVersion').mockReturnValue('1.0.0')
      jest.spyOn(deviceInfo, 'getBuildNumber').mockReturnValue('100')

      const systemCheck = new UpdateDeviceRegistrationSystemCheck('1.0.0', '', updateRegistrationMock, mockUtils)

      const result = systemCheck.runCheck()

      expect(result).toBe(false)
    })
  })
  describe('onFail', () => {
    it('should update registration and dispatch the new app version', async () => {
      const mockUtils = {
        translation: jest.fn() as any,
        logger: new MockLogger(),
      }
      const updateRegistrationMock = jest.fn()

      const systemCheck = new UpdateDeviceRegistrationSystemCheck('1.0.0', '100', updateRegistrationMock, mockUtils)

      await systemCheck.onFail()

      expect(mockUpdateApp).toHaveBeenCalledWith({ appVersion: expect.any(String), appBuildNumber: expect.any(String) })
      expect(updateRegistrationMock).toHaveBeenCalled()
    })
    it('should log an error if update registration fails', async () => {
      const mockUtils = {
        translation: jest.fn() as any,
        logger: new MockLogger(),
      }
      const error = new Error('Registration failed')
      const updateRegistrationMock = jest.fn().mockRejectedValue(error)

      const systemCheck = new UpdateDeviceRegistrationSystemCheck('1.0.0', '100', updateRegistrationMock, mockUtils)

      await systemCheck.onFail()

      expect(mockUtils.logger.error).toHaveBeenCalledWith(
        'UpdateDeviceRegistrationSystemCheck: Failed to update device registration',
        error
      )
    })
    it('should fold AppError fullMessage into the log message so it reaches problem reports', async () => {
      const mockUtils = {
        translation: jest.fn() as any,
        logger: new MockLogger(),
      }
      const appError = mockAppError(AppEventCode.ERR_120_KEYCHAIN_KEY_DOESNT_EXIST_ERROR)
      const updateRegistrationMock = jest.fn().mockRejectedValue(appError)

      const systemCheck = new UpdateDeviceRegistrationSystemCheck('1.0.0', '100', updateRegistrationMock, mockUtils)

      await systemCheck.onFail()

      expect(mockUtils.logger.error).toHaveBeenCalledWith(
        `UpdateDeviceRegistrationSystemCheck: Failed to update device registration: ${appError.fullMessage}`,
        appError.toJSON()
      )
    })
  })
})
