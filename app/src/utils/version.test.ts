import deviceInfo from 'react-native-device-info'

import { AppVersion, isNewerVersion, isVersionAtLeast } from './version'

const expectIsVersionAtLeast = (appVersion: string, minVersion: string, expected: boolean) => {
  jest.spyOn(deviceInfo, 'getVersion').mockReturnValue(appVersion)

  expect(isVersionAtLeast(minVersion)).toBe(expected)
}

describe('isVersionAtLeast', () => {
  describe('exact version comparisons', () => {
    it.each([
      ['4.1.0', '4.1.0', true, 'the app version equals the minimum version'],
      ['5.0.0', '4.9.9', true, 'the major version is greater'],
      ['3.9.9', '4.0.0', false, 'the major version is lower'],
      ['4.2.0', '4.1.9', true, 'the minor version is greater within the same major'],
      ['4.0.9', '4.1.0', false, 'the minor version is lower within the same major'],
      ['4.1.2', '4.1.1', true, 'the patch version is greater'],
      ['4.1.0', '4.1.1', false, 'the patch version is lower'],
    ])('app %s vs minimum %s -> %s when %s', expectIsVersionAtLeast)
  })

  describe('wildcard segments', () => {
    it.each([
      ['4.1.0', '4.1.x', true, 'the patch segment is ignored for an "x" minimum'],
      ['4.2.0', '4.1.x', true, 'the minor version exceeds a wildcard minimum'],
      ['4.0.9', '4.1.x', false, 'the version is below a wildcard minimum'],
      ['4.1.3', '4.1.*', true, '"*" is used as a wildcard segment'],
      ['0.0.1', 'x', true, 'the first segment is a wildcard'],
    ])('app %s vs minimum %s -> %s when %s', expectIsVersionAtLeast)
  })

  describe('versions with differing segment counts', () => {
    it.each([
      ['4.1', '4.1.1', false, 'missing app version segments are treated as 0'],
      ['4.1', '4.1.0', true, 'missing segments compare equal to 0'],
      ['4.1.2', '4.1', true, 'the app version has more segments than the minimum'],
    ])('app %s vs minimum %s -> %s when %s', expectIsVersionAtLeast)
  })

  describe('AppVersion enum values', () => {
    it.each([
      ['4.1.0', AppVersion.V4_1_x, true, 'the app version is within V4_1_x'],
      ['4.2.0', AppVersion.V4_1_x, true, 'the app version is above V4_1_x'],
      ['4.1.5', AppVersion.V4_2_x, false, 'the app version is below V4_2_x'],
      ['4.0.3', AppVersion.V4_0_x, true, 'the app version satisfies V4_0_x'],
    ])('app %s vs minimum %s -> %s when %s', expectIsVersionAtLeast)
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
