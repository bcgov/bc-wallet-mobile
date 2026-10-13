import { BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import { BCSCModals } from '@/bcsc-theme/types/navigators'
import { UpdateAppSystemCheck } from '@/services/system-checks/UpdateAppSystemCheck'
import { BCDispatchAction } from '@/store'
import { MockLogger } from '@bifold/core'
import deviceInfo from 'react-native-device-info'

const createUtils = () => {
  const logger = new MockLogger()
  const info = jest.spyOn(logger, 'info')

  return {
    dispatch: jest.fn(),
    translation: jest.fn().mockReturnValue('Update available') as any,
    logger,
    info,
  }
}

const mockInstalled = (version: string, build: string) => {
  jest.spyOn(deviceInfo, 'getVersion').mockReturnValue(version)
  jest.spyOn(deviceInfo, 'getBuildNumber').mockReturnValue(build)
}

const updateBanner = {
  type: BCDispatchAction.ADD_BANNER_MESSAGE,
  payload: [
    {
      id: BCSCBanner.APP_UPDATE_AVAILABLE,
      title: 'Update available',
      type: 'info',
      dismissible: true,
    },
  ],
}

const removeBanner = {
  type: BCDispatchAction.REMOVE_BANNER_MESSAGE,
  payload: [BCSCBanner.APP_UPDATE_AVAILABLE],
}

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
        translation: jest.fn() as any,
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
        translation: jest.fn() as any,
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
        translation: jest.fn() as any,
        logger: new MockLogger(),
      }

      const mockGetVersion = jest.spyOn(deviceInfo, 'getBuildNumber').mockReturnValue('99')

      const updateAppCheck = new UpdateAppSystemCheck(mockServerStatus, mockNavigation, mockUtils)

      const result = updateAppCheck.runCheck()

      expect(mockGetVersion).toHaveBeenCalled()
      expect(result).toBe(false)
    })

    it('logs the server status with the verbatim server field names', () => {
      mockInstalled('4.1.2', '200')
      const mockUtils = createUtils()
      const serverStatus: any = { minVersion: '100', minVersionNumber: '4.0.0', supportedVersions: ['4.1.2'] }

      new UpdateAppSystemCheck(serverStatus, {} as any, mockUtils).runCheck()

      expect(mockUtils.info).toHaveBeenCalledWith(
        '[UpdateAppSystemCheck] server status',
        expect.objectContaining({ minVersion: '100', minVersionNumber: '4.0.0', supportedVersions: ['4.1.2'] })
      )
    })

    it.each([
      ['missing', undefined],
      ['non-numeric', 'abc'],
    ])('should return true (fail open) when min build is %s', (_label, minVersion) => {
      const mockServerStatus: any = { minVersion, supportedVersions: [] }
      jest.spyOn(deviceInfo, 'getBuildNumber').mockReturnValue('99')

      const updateAppCheck = new UpdateAppSystemCheck(mockServerStatus, {} as any, createUtils())

      expect(updateAppCheck.runCheck()).toBe(true)
    })
  })
  describe('onFail', () => {
    it('MandatoryUpdate: navigates to the blocking modal and dispatches nothing', () => {
      mockInstalled('4.0.2', '99')
      const mockNavigation = { navigate: jest.fn() } as any
      const mockUtils = createUtils()

      new UpdateAppSystemCheck(
        { minVersion: '100', supportedVersions: ['2.0.0'] } as any,
        mockNavigation,
        mockUtils
      ).onFail()

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCModals.MandatoryUpdate)
      expect(mockUtils.dispatch).not.toHaveBeenCalled()
    })

    it('logs the mandatory update result', () => {
      mockInstalled('4.0.2', '99')
      const mockUtils = createUtils()

      new UpdateAppSystemCheck(
        { minVersion: '100', supportedVersions: [] } as any,
        { navigate: jest.fn() } as any,
        mockUtils
      ).onFail()

      expect(mockUtils.info).toHaveBeenCalledWith('[UpdateAppSystemCheck] result: mandatory update', {
        appBuild: 99,
        minVersion: '100',
      })
    })

    it('MandatoryUpdate: still wins when the app version is supported and a newer GA version exists', () => {
      mockInstalled('4.0.2', '99')
      const mockNavigation = { navigate: jest.fn() } as any
      const mockUtils = createUtils()

      new UpdateAppSystemCheck(
        { minVersion: '100', supportedVersions: ['4.0.2', '4.1.0'] } as any,
        mockNavigation,
        mockUtils
      ).onFail()

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCModals.MandatoryUpdate)
      expect(mockUtils.dispatch).not.toHaveBeenCalled()
    })
  })

  describe('onSuccess', () => {
    const run = (supportedVersions: unknown, version = '4.1.2') => {
      mockInstalled(version, '200')
      const mockNavigation = { navigate: jest.fn() } as any
      const mockUtils = createUtils()
      const serverStatus: any = supportedVersions === undefined ? {} : { minVersion: '100', supportedVersions }

      new UpdateAppSystemCheck(serverStatus, mockNavigation, mockUtils).onSuccess()

      return { mockNavigation, mockUtils }
    }

    it('OptionalUpdate: adds the info banner when a supported version is newer than the app', () => {
      const { mockNavigation, mockUtils } = run(['0.13', '4.2.0', '4.1.2'])

      expect(mockUtils.dispatch).toHaveBeenCalledTimes(1)
      expect(mockUtils.dispatch).toHaveBeenCalledWith(updateBanner)
      expect(mockUtils.translation).toHaveBeenCalledWith('BCSC.SystemChecks.UpdateApp.UpdateAvailableBannerTitle')
      expect(mockUtils.info).toHaveBeenCalledWith('[UpdateAppSystemCheck] result: optional update', {
        appVersion: '4.1.2',
      })
      expect(mockNavigation.navigate).not.toHaveBeenCalled()
    })

    it('OptionalUpdate: finds the newest version when the list is unsorted', () => {
      const { mockUtils } = run(['4.2.0', '3.15.1', '4.0.2'])

      expect(mockUtils.dispatch).toHaveBeenCalledWith(updateBanner)
    })

    it('OptionalUpdate: still shows the banner when invalid entries are mixed with a newer valid one', () => {
      const { mockUtils } = run(['', 'abc', null, 42, '4.x', '4.2.0'])

      expect(mockUtils.dispatch).toHaveBeenCalledWith(updateBanner)
    })

    it('OptionalUpdate: compares two-digit segments numerically (4.10 is newer than 4.9)', () => {
      const { mockUtils } = run(['4.10'], '4.9.0')

      expect(mockUtils.dispatch).toHaveBeenCalledWith(updateBanner)
    })

    it('NoUpdate: removes the banner when the app is on the newest supported version', () => {
      const { mockUtils } = run(['3.15.1', '4.0.2', '4.1.2'])

      expect(mockUtils.dispatch).toHaveBeenCalledTimes(1)
      expect(mockUtils.dispatch).toHaveBeenCalledWith(removeBanner)
      expect(mockUtils.info).toHaveBeenCalledWith('[UpdateAppSystemCheck] result: no update', {
        appVersion: '4.1.2',
        appBuild: 200,
      })
    })

    it('NoUpdate: removes the banner when the app is newer than every supported version', () => {
      const { mockUtils } = run(['3.15.1', '4.0.2'])

      expect(mockUtils.dispatch).toHaveBeenCalledWith(removeBanner)
    })

    it('NoUpdate: removes the banner and does not throw when every entry is invalid', () => {
      const { mockUtils } = run(['', 'abc', null, '4.x'])

      expect(mockUtils.dispatch).toHaveBeenCalledWith(removeBanner)
    })

    it.each([
      ['missing', undefined],
      ['null', null],
      ['not an array', '4.2.0'],
    ])('NoUpdate: removes the banner when supportedVersions is %s', (_label, supportedVersions) => {
      const { mockUtils } = run(supportedVersions)

      expect(mockUtils.dispatch).toHaveBeenCalledWith(removeBanner)
    })
  })
})
