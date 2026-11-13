import { ServerStatusResponseData } from '@/bcsc-theme/api/hooks/useConfigApi'
import { AppUpdate } from './app-update'
import { selectAppUpdate } from './selectors'

// The device-info mock reports app version 4.0.0 and build 142
const buildServerStatus = (overrides: Partial<ServerStatusResponseData> = {}): ServerStatusResponseData =>
  ({ minVersion: '100', supportedVersions: ['4.0.0', '4.1.0'], ...overrides }) as ServerStatusResponseData

describe('selectAppUpdate', () => {
  it('returns Optional when the server lists a newer version', () => {
    expect(selectAppUpdate(buildServerStatus())).toBe(AppUpdate.Optional)
  })

  it('returns Unknown when the server status is not loaded', () => {
    expect(selectAppUpdate(null)).toBe(AppUpdate.Unknown)
  })

  it('returns Unknown when supportedVersions is missing', () => {
    const serverStatus = buildServerStatus({ supportedVersions: undefined as unknown as string[] })

    expect(selectAppUpdate(serverStatus)).toBe(AppUpdate.Unknown)
  })

  it('returns None when no listed version is newer than the app', () => {
    expect(selectAppUpdate(buildServerStatus({ supportedVersions: ['3.9.0', '4.0.0'] }))).toBe(AppUpdate.None)
  })

  it('returns Mandatory when the app build is below the minimum build', () => {
    expect(selectAppUpdate(buildServerStatus({ minVersion: '200' }))).toBe(AppUpdate.Mandatory)
  })

  it('returns Unknown when the minimum build is not numeric', () => {
    expect(selectAppUpdate(buildServerStatus({ minVersion: 'abc' }))).toBe(AppUpdate.Unknown)
  })

  it('returns Unknown when the minimum build is missing', () => {
    expect(selectAppUpdate(buildServerStatus({ minVersion: undefined as unknown as string }))).toBe(AppUpdate.Unknown)
  })
})
