import { BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import { BCSCModals } from '@/bcsc-theme/types/navigators'
import { UpdateAppSystemCheck } from '@/services/system-checks/UpdateAppSystemCheck'
import { BCDispatchAction } from '@/store'
import deviceInfo from 'react-native-device-info'

describe('UpdateAppSystemCheck', () => {
  describe('runCheck', () => {
    it('should return true when no update is needed', async () => {
      const mockServerStatus: any = {
        supportedVersions: ['1.0.0', '1.1.0', '1.2.0'],
      }
      const mockNavigation = {} as any
      const mockUtils = {
        dispatch: jest.fn(),
        translation: jest.fn(),
        logger: {} as any,
      }

      const mockGetVersion = jest.spyOn(deviceInfo, 'getVersion').mockReturnValue('1.2.0')

      const updateAppCheck = new UpdateAppSystemCheck(mockServerStatus, mockNavigation, mockUtils)

      const result = await updateAppCheck.runCheck()

      expect(mockGetVersion).toHaveBeenCalled()
      expect(result).toBe(true)
    })
  })
  describe('onFail', () => {
    it('should navigate to MandatoryUpdate modal when major update is required', () => {
      const mockServerStatus: any = {
        minVersion: '2.0.0',
      }
      const mockNavigation = {
        navigate: jest.fn(),
      } as any
      const mockUtils = {
        dispatch: jest.fn(),
        translation: jest.fn(),
        logger: {} as any,
      }

      const mockGetVersion = jest.spyOn(deviceInfo, 'getVersion').mockReturnValue('1.2.0')

      const updateAppCheck: any = new UpdateAppSystemCheck(mockServerStatus, mockNavigation, mockUtils)

      updateAppCheck.versionInfoCache = { updateType: 'major' } as any

      updateAppCheck.onFail()

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCModals.MandatoryUpdate)
      expect(mockUtils.dispatch).not.toHaveBeenCalled()
      expect(mockGetVersion).toHaveBeenCalled()
    })

    it('should dispatch optional update banner when optional update is available', () => {
      const mockServerStatus: any = {
        minVersion: '1.0.0',
        supportedVersions: ['1.0.0', '1.1.0', '1.2.0'],
      }
      const mockNavigation = { navigate: jest.fn() } as any
      const mockUtils = {
        dispatch: jest.fn(),
        translation: jest.fn().mockReturnValue('Update available'),
        logger: {} as any,
      }

      const mockGetVersion = jest.spyOn(deviceInfo, 'getVersion').mockReturnValue('1.0.0')

      const updateAppCheck: any = new UpdateAppSystemCheck(mockServerStatus, mockNavigation, mockUtils)

      updateAppCheck.versionInfoCache = { updateType: 'minor' } as any

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
        logger: {} as any,
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
