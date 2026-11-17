import { AppUpdate, getAppUpdate } from './app-update'

describe('getAppUpdate', () => {
  const facts = { appVersion: '3.0.0', appBuild: 101, minBuild: 100, supportedVersions: ['3.0.0', '3.1.0'] }

  it('returns Optional when a supported version is newer than the app', () => {
    expect(getAppUpdate(facts)).toBe(AppUpdate.Optional)
  })

  it('returns None when no supported version is newer than the app', () => {
    expect(getAppUpdate({ ...facts, appVersion: '3.1.0' })).toBe(AppUpdate.None)
  })

  it('returns None when the supported versions are empty', () => {
    expect(getAppUpdate({ ...facts, supportedVersions: [] })).toBe(AppUpdate.None)
  })

  it('ignores invalid entries and still finds a newer valid one', () => {
    const supportedVersions = [null, 42, '3.1.0'] as unknown as string[]

    expect(getAppUpdate({ ...facts, supportedVersions })).toBe(AppUpdate.Optional)
  })

  it('returns Mandatory when the build is below the minimum build', () => {
    expect(getAppUpdate({ ...facts, appBuild: 99 })).toBe(AppUpdate.Mandatory)
  })

  it('returns Mandatory when the build is below the minimum build, whatever the supported versions', () => {
    expect(getAppUpdate({ ...facts, appBuild: 99, supportedVersions: [] })).toBe(AppUpdate.Mandatory)
  })

  it('returns Optional when the build equals the minimum build', () => {
    expect(getAppUpdate({ ...facts, appBuild: 100 })).toBe(AppUpdate.Optional)
  })

  it('returns Unknown when the minimum build is missing', () => {
    expect(getAppUpdate({ ...facts, minBuild: undefined })).toBe(AppUpdate.Unknown)
  })

  it('returns Unknown when the minimum build is not a number', () => {
    expect(getAppUpdate({ ...facts, minBuild: NaN })).toBe(AppUpdate.Unknown)
  })

  it('returns Unknown when the supported versions are missing', () => {
    expect(getAppUpdate({ ...facts, supportedVersions: undefined })).toBe(AppUpdate.Unknown)
  })
})
