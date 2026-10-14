import { PermissionsAndroid, Platform } from 'react-native'
import { isBluetoothAudioConnected } from 'react-native-bcsc-core'
import { deviceRequiresBluetoothPermission, requestBluetoothPermission } from './bluetooth'

jest.mock('react-native-bcsc-core', () => ({
  isBluetoothAudioConnected: jest.fn(),
}))

describe('bluetooth utils', () => {
  const mockIsBluetoothAudioConnected = jest.mocked(isBluetoothAudioConnected)
  let requestSpy: jest.SpyInstance
  let checkSpy: jest.SpyInstance

  const setPlatform = (os: 'ios' | 'android', version: number | string) => {
    jest.replaceProperty(Platform, 'OS', os)
    jest.spyOn(Platform, 'Version', 'get').mockReturnValue(version)
  }

  beforeEach(() => {
    jest.clearAllMocks()
    requestSpy = jest.spyOn(PermissionsAndroid, 'request')
    checkSpy = jest.spyOn(PermissionsAndroid, 'check')
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('requestBluetoothPermission', () => {
    it('requests BLUETOOTH_CONNECT and returns true when granted', async () => {
      requestSpy.mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED)

      await expect(requestBluetoothPermission()).resolves.toBe(true)
      expect(requestSpy).toHaveBeenCalledWith(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT)
    })

    it.each([PermissionsAndroid.RESULTS.DENIED, PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN])(
      'returns false when the result is %s',
      async (result) => {
        requestSpy.mockResolvedValue(result)

        await expect(requestBluetoothPermission()).resolves.toBe(false)
      }
    )
  })

  describe('deviceRequiresBluetoothPermission', () => {
    it('returns false on iOS without checking anything', async () => {
      setPlatform('ios', '17.0')

      await expect(deviceRequiresBluetoothPermission()).resolves.toBe(false)
      expect(checkSpy).not.toHaveBeenCalled()
      expect(mockIsBluetoothAudioConnected).not.toHaveBeenCalled()
    })

    it('returns false on Android below API 31', async () => {
      setPlatform('android', 30)

      await expect(deviceRequiresBluetoothPermission()).resolves.toBe(false)
      expect(checkSpy).not.toHaveBeenCalled()
    })

    it('returns false when the permission is already granted', async () => {
      setPlatform('android', 31)
      checkSpy.mockResolvedValue(true)

      await expect(deviceRequiresBluetoothPermission()).resolves.toBe(false)
      expect(checkSpy).toHaveBeenCalledWith(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT)
      expect(mockIsBluetoothAudioConnected).not.toHaveBeenCalled()
    })

    it('returns false when no Bluetooth audio device is connected', async () => {
      setPlatform('android', 33)
      checkSpy.mockResolvedValue(false)
      mockIsBluetoothAudioConnected.mockResolvedValue(false)

      await expect(deviceRequiresBluetoothPermission()).resolves.toBe(false)
    })

    it('returns true when permission is missing and Bluetooth audio is connected', async () => {
      setPlatform('android', 31)
      checkSpy.mockResolvedValue(false)
      mockIsBluetoothAudioConnected.mockResolvedValue(true)

      await expect(deviceRequiresBluetoothPermission()).resolves.toBe(true)
    })
  })
})
