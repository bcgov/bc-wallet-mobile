import { getUpdateBannerVisible } from './update-banner'

describe('getUpdateBannerVisible', () => {
  const facts = { appVersion: '3.0.0', appBuild: 101, minBuild: 100, supportedVersions: ['3.0.0', '3.1.0'] }

  it('returns true when a supported version is newer than the app', () => {
    expect(getUpdateBannerVisible(facts)).toBe(true)
  })

  it('returns false when no supported version is newer than the app', () => {
    expect(getUpdateBannerVisible({ ...facts, appVersion: '3.1.0' })).toBe(false)
  })

  it('returns false when the supported versions are empty', () => {
    expect(getUpdateBannerVisible({ ...facts, supportedVersions: [] })).toBe(false)
  })

  it('ignores invalid entries and still finds a newer valid one', () => {
    const supportedVersions = [null, 42, '3.1.0'] as unknown as string[]

    expect(getUpdateBannerVisible({ ...facts, supportedVersions })).toBe(true)
  })

  it('returns false when the build is below the minimum build', () => {
    expect(getUpdateBannerVisible({ ...facts, appBuild: 99 })).toBe(false)
  })

  it('returns true when the build equals the minimum build', () => {
    expect(getUpdateBannerVisible({ ...facts, appBuild: 100 })).toBe(true)
  })

  it('fails open when the minimum build is not a number', () => {
    expect(getUpdateBannerVisible({ ...facts, minBuild: NaN })).toBe(true)
  })
})
