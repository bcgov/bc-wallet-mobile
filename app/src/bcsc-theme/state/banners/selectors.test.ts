import { ServerStatusResponseData } from '@/bcsc-theme/api/hooks/useConfigApi'
import { selectUpdateBannerVisible } from './selectors'

// The device-info mock reports app version 4.0.0 and build 142
const buildServerStatus = (overrides: Partial<ServerStatusResponseData> = {}): ServerStatusResponseData =>
  ({ minVersion: '100', supportedVersions: ['4.0.0', '4.1.0'], ...overrides }) as ServerStatusResponseData

describe('selectUpdateBannerVisible', () => {
  it('returns true when the server lists a newer version', () => {
    expect(selectUpdateBannerVisible(buildServerStatus())).toBe(true)
  })

  it('returns false when the server status is not loaded', () => {
    expect(selectUpdateBannerVisible(null)).toBe(false)
  })

  it('returns false when supportedVersions is not an array', () => {
    const serverStatus = buildServerStatus({ supportedVersions: undefined as unknown as string[] })

    expect(selectUpdateBannerVisible(serverStatus)).toBe(false)
  })

  it('returns false when no listed version is newer than the app', () => {
    expect(selectUpdateBannerVisible(buildServerStatus({ supportedVersions: ['3.9.0', '4.0.0'] }))).toBe(false)
  })

  it('returns false when the app build is below the minimum build', () => {
    expect(selectUpdateBannerVisible(buildServerStatus({ minVersion: '200' }))).toBe(false)
  })

  it('fails open when the minimum build is not numeric', () => {
    expect(selectUpdateBannerVisible(buildServerStatus({ minVersion: 'abc' }))).toBe(true)
  })
})
