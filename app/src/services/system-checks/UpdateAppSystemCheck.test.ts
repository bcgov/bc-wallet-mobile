import { BCSCModals } from '@/bcsc-theme/types/navigators'
import { UpdateAppSystemCheck } from '@/services/system-checks/UpdateAppSystemCheck'
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
})
