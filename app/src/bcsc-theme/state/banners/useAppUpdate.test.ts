import { BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import * as ServerStatusContext from '@/bcsc-theme/contexts/ServerStatusContext'
import * as links from '@/utils/links'
import { act, renderHook } from '@testing-library/react-native'
import { MIGRATED_BANNER_IDS, useBanners, useUpdateBanner } from './useAppUpdate'

// The device-info mock reports app version 4.0.0 and build 142
const mockServerStatus = (serverStatus: unknown) =>
  jest.spyOn(ServerStatusContext, 'useServerStatus').mockReturnValue({
    isAvailable: true,
    serverStatus: serverStatus as any,
    isChecking: false,
    hasChecked: true,
    refresh: jest.fn(),
  })

const newerVersionStatus = { minVersion: '100', supportedVersions: ['4.0.0', '4.1.0'] }

describe('MIGRATED_BANNER_IDS', () => {
  it('includes the update banner', () => {
    expect(MIGRATED_BANNER_IDS).toContain(BCSCBanner.APP_UPDATE_AVAILABLE)
  })
})

describe('useUpdateBanner', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns the info banner when a newer version is available', () => {
    mockServerStatus(newerVersionStatus)

    const { result } = renderHook(() => useUpdateBanner())

    expect(result.current).toMatchObject({
      id: BCSCBanner.APP_UPDATE_AVAILABLE,
      title: 'BCSC.SystemChecks.UpdateApp.UpdateAvailableBannerTitle',
      type: 'info',
      dismissible: true,
    })
  })

  it('returns null when no newer version is available', () => {
    mockServerStatus({ minVersion: '100', supportedVersions: ['4.0.0'] })

    const { result } = renderHook(() => useUpdateBanner())

    expect(result.current).toBeNull()
  })

  it('returns null when the server status is unavailable', () => {
    mockServerStatus(null)

    const { result } = renderHook(() => useUpdateBanner())

    expect(result.current).toBeNull()
  })

  it('opens the app store and hides the banner when pressed', () => {
    mockServerStatus(newerVersionStatus)
    jest.spyOn(links, 'getBCSCAppStoreUrl').mockReturnValue('https://example.com/store')
    const openLinkSpy = jest.spyOn(links, 'openLink').mockResolvedValue(undefined as any)

    const { result } = renderHook(() => useUpdateBanner())

    act(() => {
      result.current?.onPress?.(BCSCBanner.APP_UPDATE_AVAILABLE)
    })

    expect(openLinkSpy).toHaveBeenCalledWith('https://example.com/store')
    expect(result.current).toBeNull()
  })
})

describe('useBanners', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns the update banner when it applies', () => {
    mockServerStatus(newerVersionStatus)

    const { result } = renderHook(() => useBanners())

    expect(result.current.map((banner) => banner.id)).toEqual([BCSCBanner.APP_UPDATE_AVAILABLE])
  })

  it('returns an empty array when no banner applies', () => {
    mockServerStatus(null)

    const { result } = renderHook(() => useBanners())

    expect(result.current).toEqual([])
  })
})
