import { BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import { BCSCModals } from '@/bcsc-theme/types/navigators'
import { UpdateAppSystemCheck } from '@/services/system-checks/UpdateAppSystemCheck'
import { BCDispatchAction } from '@/store'
import { MockLogger } from '@bifold/core'
import deviceInfo from 'react-native-device-info'

describe('UpdateAppSystemCheck', () => {
  describe('runCheck', () => {
    it('should return true when app build is same as min build', async () => {
      const mockServerStatus: any = {
        minVersion: '100',
        supportedVersions: [],
      }
      const mockNavigation = {} as any
      const mockUtils = {
        dispatch: jest.fn(),
        translation: jest.fn(),
        logger: new MockLogger(),
      }

      const mockGetVersion = jest.spyOn(deviceInfo, 'getBuildNumber').mockReturnValue('100')

      const updateAppCheck = new UpdateAppSystemCheck(mockServerStatus, mockNavigation, mockUtils)

      const result = updateAppCheck.runCheck()

      expect(mockGetVersion).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('should return true when app build is greater than min build', async () => {
      const mockServerStatus: any = {
        minVersion: '100',
        supportedVersions: [],
      }
      const mockNavigation = {} as any
      const mockUtils = {
        dispatch: jest.fn(),
        translation: jest.fn(),
        logger: new MockLogger(),
      }

      const mockGetVersion = jest.spyOn(deviceInfo, 'getBuildNumber').mockReturnValue('101')

      const updateAppCheck = new UpdateAppSystemCheck(mockServerStatus, mockNavigation, mockUtils)

      const result = updateAppCheck.runCheck()

      expect(mockGetVersion).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('should return false when app build is less than min build', async () => {
      const mockServerStatus: any = {
        minVersion: '100',
        supportedVersions: [],
      }
      const mockNavigation = {} as any
      const mockUtils = {
        dispatch: jest.fn(),
        translation: jest.fn(),
        logger: new MockLogger(),
      }

      const mockGetVersion = jest.spyOn(deviceInfo, 'getBuildNumber').mockReturnValue('99')

      const updateAppCheck = new UpdateAppSystemCheck(mockServerStatus, mockNavigation, mockUtils)

      const result = updateAppCheck.runCheck()

      expect(mockGetVersion).toHaveBeenCalled()
      expect(result).toBe(false)
    })
  })
  describe('onFail', () => {
    it('MandatoryUpdate: should navigate to blocking modal when app version not in supported versions', () => {
      const mockServerStatus: any = {
        supportedVersions: ['2.0.0'],
      }
      const mockNavigation = {
        navigate: jest.fn(),
      } as any
      const mockUtils = {
        dispatch: jest.fn(),
        translation: jest.fn(),
        logger: new MockLogger(),
      }

      const mockGetVersion = jest.spyOn(deviceInfo, 'getVersion').mockReturnValue('1.2.0')

      const updateAppCheck: any = new UpdateAppSystemCheck(mockServerStatus, mockNavigation, mockUtils)

      updateAppCheck.onFail()

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCModals.MandatoryUpdate)
      expect(mockUtils.dispatch).not.toHaveBeenCalled()
      expect(mockGetVersion).toHaveBeenCalled()
    })

    it('OptionalUpdate: should dispatch update app banner when app version supported', () => {
      const mockServerStatus: any = {
        supportedVersions: ['1.0.0', '1.1.0', '1.2.0'],
      }
      const mockNavigation = { navigate: jest.fn() } as any
      const mockUtils = {
        dispatch: jest.fn(),
        translation: jest.fn().mockReturnValue('Update available'),
        logger: new MockLogger(),
      }

      const mockGetVersion = jest.spyOn(deviceInfo, 'getVersion').mockReturnValue('1.0.0')

      const updateAppCheck: any = new UpdateAppSystemCheck(mockServerStatus, mockNavigation, mockUtils)

      updateAppCheck.onFail()

      expect(mockUtils.dispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.ADD_BANNER_MESSAGE,
        payload: [
          expect.objectContaining({
            id: BCSCBanner.APP_UPDATE_AVAILABLE,
            title: expect.any(String),
            type: 'info',
            variant: 'warning',
            dismissible: true,
          }),
        ],
      })
      expect(mockNavigation.navigate).not.toHaveBeenCalled()
      expect(mockGetVersion).toHaveBeenCalled()
    })
  })
  describe('onSuccess', () => {
    it('should dispatch action to remove the app update banner message', () => {
      const mockServerStatus: any = {}
      const mockNavigation = {} as any
      const mockUtils = {
        dispatch: jest.fn(),
        translation: jest.fn(),
        logger: new MockLogger(),
      }

      const updateAppCheck = new UpdateAppSystemCheck(mockServerStatus, mockNavigation, mockUtils)
      updateAppCheck.onSuccess()

      expect(mockUtils.dispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.REMOVE_BANNER_MESSAGE,
        payload: [BCSCBanner.APP_UPDATE_AVAILABLE],
      })
    })
  })
})
