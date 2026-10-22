import deviceInfo from 'react-native-device-info'

import { AppVersion, isNewerVersion, isVersionAtLeast } from './version'

describe('isVersionAtLeast', () => {
  describe('exact version comparisons', () => {
    it('returns true when the app version equals the minimum version', () => {
      jest.spyOn(deviceInfo, 'getVersion').mockReturnValue('4.1.0')

      expect(isVersionAtLeast('4.1.0')).toBe(true)
    })

    it('returns true when the major version is greater', () => {
      jest.spyOn(deviceInfo, 'getVersion').mockReturnValue('5.0.0')

      expect(isVersionAtLeast('4.9.9')).toBe(true)
    })

    it('returns false when the major version is lower', () => {
      jest.spyOn(deviceInfo, 'getVersion').mockReturnValue('3.9.9')

      expect(isVersionAtLeast('4.0.0')).toBe(false)
    })

    it('returns true when the minor version is greater within the same major', () => {
      jest.spyOn(deviceInfo, 'getVersion').mockReturnValue('4.2.0')

      expect(isVersionAtLeast('4.1.9')).toBe(true)
    })

    it('returns false when the minor version is lower within the same major', () => {
      jest.spyOn(deviceInfo, 'getVersion').mockReturnValue('4.0.9')

      expect(isVersionAtLeast('4.1.0')).toBe(false)
    })

    it('returns true when the patch version is greater', () => {
      jest.spyOn(deviceInfo, 'getVersion').mockReturnValue('4.1.2')

      expect(isVersionAtLeast('4.1.1')).toBe(true)
    })

    it('returns false when the patch version is lower', () => {
      jest.spyOn(deviceInfo, 'getVersion').mockReturnValue('4.1.0')

      expect(isVersionAtLeast('4.1.1')).toBe(false)
    })
  })

  describe('wildcard segments', () => {
    it('ignores the patch segment when the minimum version uses "x"', () => {
      jest.spyOn(deviceInfo, 'getVersion').mockReturnValue('4.1.0')

      expect(isVersionAtLeast('4.1.x')).toBe(true)
    })

    it('returns true when the minor version exceeds a wildcard minimum', () => {
      jest.spyOn(deviceInfo, 'getVersion').mockReturnValue('4.2.0')

      expect(isVersionAtLeast('4.1.x')).toBe(true)
    })

    it('returns false when the version is below a wildcard minimum', () => {
      jest.spyOn(deviceInfo, 'getVersion').mockReturnValue('4.0.9')

      expect(isVersionAtLeast('4.1.x')).toBe(false)
    })

    it('supports "*" as a wildcard segment', () => {
      jest.spyOn(deviceInfo, 'getVersion').mockReturnValue('4.1.3')

      expect(isVersionAtLeast('4.1.*')).toBe(true)
    })

    it('returns true for any version when the first segment is a wildcard', () => {
      jest.spyOn(deviceInfo, 'getVersion').mockReturnValue('0.0.1')

      expect(isVersionAtLeast('x')).toBe(true)
    })
  })

  describe('versions with differing segment counts', () => {
    it('treats missing app version segments as 0', () => {
      jest.spyOn(deviceInfo, 'getVersion').mockReturnValue('4.1')

      expect(isVersionAtLeast('4.1.1')).toBe(false)
    })

    it('returns true when missing segments compare equal to 0', () => {
      jest.spyOn(deviceInfo, 'getVersion').mockReturnValue('4.1')

      expect(isVersionAtLeast('4.1.0')).toBe(true)
    })

    it('returns true when the app version has more segments than the minimum', () => {
      jest.spyOn(deviceInfo, 'getVersion').mockReturnValue('4.1.2')

      expect(isVersionAtLeast('4.1')).toBe(true)
    })
  })

  describe('AppVersion enum values', () => {
    it('returns true when the app version is within V4_1_x', () => {
      jest.spyOn(deviceInfo, 'getVersion').mockReturnValue('4.1.0')

      expect(isVersionAtLeast(AppVersion.V4_1_x)).toBe(true)
    })

    it('returns true when the app version is above V4_1_x', () => {
      jest.spyOn(deviceInfo, 'getVersion').mockReturnValue('4.2.0')

      expect(isVersionAtLeast(AppVersion.V4_1_x)).toBe(true)
    })

    it('returns false when the app version is below V4_2_x', () => {
      jest.spyOn(deviceInfo, 'getVersion').mockReturnValue('4.1.5')

      expect(isVersionAtLeast(AppVersion.V4_2_x)).toBe(false)
    })

    it('returns true when the app version satisfies V4_0_x', () => {
      jest.spyOn(deviceInfo, 'getVersion').mockReturnValue('4.0.3')

      expect(isVersionAtLeast(AppVersion.V4_0_x)).toBe(true)
    })
  })
})

describe('isNewerVersion', () => {
  it.each([
    ['4.2.0', '4.1.2', true, 'the minor version is greater'],
    ['5.0.0', '4.9.9', true, 'the major version is greater'],
    ['4.1.3', '4.1.2', true, 'the patch version is greater'],
    ['4.1.10', '4.1.9', true, 'segments compare numerically, not lexically'],
    ['4.10', '4.9', true, 'two-digit minor compares numerically'],
    ['4.1.2', '4.1.2', false, 'the versions are equal'],
    ['4.1.0', '4.1.2', false, 'the candidate is an older patch'],
    ['0.13', '4.1.2', false, 'the candidate is an older major'],
    ['3.15.1', '4.1.2', false, 'the candidate is the previous major line'],
  ])('candidate %s vs current %s -> %s when %s', (candidate, current, expected) => {
    expect(isNewerVersion(candidate, current)).toBe(expected)
  })

  it.each([
    ['4.2', '4.1.9', true, 'a missing candidate segment is 0 but minor is greater'],
    ['4.2', '4.2.0', false, 'a missing candidate segment equals 0'],
    ['4.2.0', '4.2', false, 'a missing current segment equals 0'],
    ['4.2.0.1', '4.2', true, 'an extra non-zero segment is newer'],
  ])('candidate %s vs current %s -> %s when %s', (candidate, current, expected) => {
    expect(isNewerVersion(candidate, current)).toBe(expected)
  })

  it.each([
    ['', '4.1.2'],
    ['abc', '4.1.2'],
    ['4.x', '4.1.2'],
    ['4..1', '4.1.2'],
    ['4.2.0-rc1', '4.1.2'],
    ['5.0.0', 'unknown'],
    ['5.0.0', ''],
  ])('candidate %j vs current %j -> false because a segment is not numeric', (candidate, current) => {
    expect(isNewerVersion(candidate, current)).toBe(false)
  })
})
