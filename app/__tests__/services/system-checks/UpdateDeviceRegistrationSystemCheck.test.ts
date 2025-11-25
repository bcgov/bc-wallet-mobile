import { UpdateDeviceRegistrationSystemCheck } from '@/services/system-checks/UpdateDeviceRegistrationSystemCheck'
import { BCDispatchAction } from '@/store'
import { MockLogger } from '@bifold/core'
import deviceInfo from 'react-native-device-info'

describe('UpdateDeviceRegistrationSystemCheck', () => {
  describe('runCheck', () => {
    it('should return true when appversion is the same', async () => {
      const mockAppVersion = '1.0.0'
      const mockUtils = {
        dispatch: jest.fn(),
        translation: jest.fn(),
        logger: new MockLogger(),
      }
      const updateRegistrationMock = jest.fn()

      const mockGetVersion = jest.spyOn(deviceInfo, 'getVersion').mockReturnValue('1.0.0')

      const systemCheck = new UpdateDeviceRegistrationSystemCheck(mockAppVersion, updateRegistrationMock, mockUtils)

      const result = systemCheck.runCheck()

      expect(mockGetVersion).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('should return false when appversion is different', async () => {
      const mockAppVersion = '1.0.0'
      const mockUtils = {
        dispatch: jest.fn(),
        translation: jest.fn(),
        logger: new MockLogger(),
      }
      const updateRegistrationMock = jest.fn()

      const mockGetVersion = jest.spyOn(deviceInfo, 'getVersion').mockReturnValue('1.0.1')

      const systemCheck = new UpdateDeviceRegistrationSystemCheck(mockAppVersion, updateRegistrationMock, mockUtils)

      const result = systemCheck.runCheck()

      expect(mockGetVersion).toHaveBeenCalled()
      expect(result).toBe(false)
    })
  })
  describe('onFail', () => {
    it('should update registration and dispatch the new app version', () => {
      const mockAppVersion = '1.0.0'
      const mockUtils = {
        dispatch: jest.fn(),
        translation: jest.fn(),
        logger: new MockLogger(),
      }
      const updateRegistrationMock = jest.fn()

      const systemCheck = new UpdateDeviceRegistrationSystemCheck(mockAppVersion, updateRegistrationMock, mockUtils)

      systemCheck.onFail()

      expect(mockUtils.dispatch).toHaveBeenCalledWith({ type: BCDispatchAction.UPDATE_APP_VERSION })
      expect(updateRegistrationMock).toHaveBeenCalled()
    })
    it('should log an error if update registration fails', async () => {
      const mockAppVersion = '1.0.0'
      const mockUtils = {
        dispatch: jest.fn(),
        translation: jest.fn(),
        logger: new MockLogger(),
      }
      const error = new Error('Registration failed')
      const updateRegistrationMock = jest.fn().mockRejectedValue(error)

      const systemCheck = new UpdateDeviceRegistrationSystemCheck(mockAppVersion, updateRegistrationMock, mockUtils)

      await systemCheck.onFail()

      expect(mockUtils.logger.error).toHaveBeenCalledWith(
        'UpdateDeviceRegistrationSystemCheck: Failed to update device registration',
        error
      )
    })
  })
})
