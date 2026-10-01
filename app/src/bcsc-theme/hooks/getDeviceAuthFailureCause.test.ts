import { getDeviceAuthFailureCause } from './getDeviceAuthFailureCause'

describe('getDeviceAuthFailureCause', () => {
  describe('android', () => {
    it.each([
      [7, false],
      [9, false],
      [10, true],
    ])('classifies code %s (deviceLocked=%s) as lockout', (errorCode, deviceLocked) => {
      expect(getDeviceAuthFailureCause({ errorCode, deviceLocked }, 'android')).toBe('lockout')
    })

    it('classifies ERROR_CANCELED as interrupted', () => {
      expect(getDeviceAuthFailureCause({ errorCode: 5, deviceLocked: false }, 'android')).toBe('interrupted')
    })

    it.each([
      [10, false],
      [10, undefined],
      [13, true],
      [11, false],
      [undefined, false],
    ])('classifies code %s (deviceLocked=%s) as generic', (errorCode, deviceLocked) => {
      expect(getDeviceAuthFailureCause({ errorCode, deviceLocked }, 'android')).toBe('generic')
    })
  })

  describe('ios', () => {
    it('classifies biometryLockout as lockout', () => {
      expect(getDeviceAuthFailureCause({ errorCode: -8 }, 'ios')).toBe('lockout')
    })

    it('classifies systemCancel as interrupted', () => {
      expect(getDeviceAuthFailureCause({ errorCode: -4 }, 'ios')).toBe('interrupted')
    })

    it.each([-1, -2, -6, 7, undefined])('classifies code %s as generic', (errorCode) => {
      expect(getDeviceAuthFailureCause({ errorCode }, 'ios')).toBe('generic')
    })

    it('ignores Android-only signals', () => {
      expect(getDeviceAuthFailureCause({ errorCode: 10, deviceLocked: true }, 'ios')).toBe('generic')
      expect(getDeviceAuthFailureCause({ errorCode: 5 }, 'ios')).toBe('generic')
    })
  })

  it('classifies an unknown platform as generic', () => {
    expect(getDeviceAuthFailureCause({ errorCode: 7 }, 'web')).toBe('generic')
  })
})
