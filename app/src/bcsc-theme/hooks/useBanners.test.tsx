import * as ServerStatusContext from '@/bcsc-theme/contexts/ServerStatusContext'
import { BANNER_DISMISS_DURATION_MS } from '@/bcsc-theme/state/banners/banner-dismissal'
import { BCSCBanner } from '@/bcsc-theme/types/banners'
import { IdToken } from '@/bcsc-theme/utils/id-token'
import { DismissedBanners, initialState } from '@/store'
import * as links from '@/utils/links'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, renderHook } from '@testing-library/react-native'
import React from 'react'
import { BannersScope, useBanners } from './useBanners'

// Read from the rule's table so these tests follow it when a duration changes
const UPDATE_DISMISS_MS = BANNER_DISMISS_DURATION_MS[BCSCBanner.APP_UPDATE_AVAILABLE]
const DEVICE_LIMIT_DISMISS_MS = BANNER_DISMISS_DURATION_MS[BCSCBanner.DEVICE_LIMIT_EXCEEDED]
const UPDATE_TITLE = 'BCSC.SystemChecks.UpdateApp.UpdateAvailableBannerTitle'
const DEVICE_LIMIT_TITLE = 'BCSC.SystemChecks.Devices.DeviceLimitReachedBannerTitle'

const overLimitIdToken = { bcsc_devices_count: 4, bcsc_max_devices: 3 }
const underLimitIdToken = { bcsc_devices_count: 2, bcsc_max_devices: 3 }

// The device-info mock reports app version 4.0.0 and build 142
const mockServerStatus = (serverStatus: unknown) =>
  jest.spyOn(ServerStatusContext, 'useServerStatus').mockReturnValue({
    isAvailable: true,
    serverStatus: serverStatus as any,
    isChecking: false,
    hasChecked: true,
    refresh: jest.fn(),
  })

const optionalUpdate = { minVersion: '100', supportedVersions: ['4.0.0', '4.1.0'] }
const noUpdate = { minVersion: '100', supportedVersions: ['4.0.0'] }

interface RenderOptions {
  idToken?: Partial<IdToken>
  dismissedBanners?: DismissedBanners
}

const renderBanners = (options: Parameters<typeof useBanners>[0], { idToken, dismissedBanners }: RenderOptions = {}) =>
  renderHook(() => useBanners(options), {
    wrapper: ({ children }: React.PropsWithChildren) => (
      <BasicAppContext
        idTokenOverride={idToken}
        initialStateOverride={{ bcsc: { ...initialState.bcsc, dismissedBanners } }}
      >
        {children}
      </BasicAppContext>
    ),
  })

const titles = (banners: { title: string | undefined }[]) => banners.map((banner) => banner.title)

describe('useBanners', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('app update banner', () => {
    it('shows when an optional update is available', () => {
      mockServerStatus(optionalUpdate)

      const { result } = renderBanners({ scope: BannersScope.Auth })

      expect(result.current.banners).toEqual([
        expect.objectContaining({ id: BCSCBanner.APP_UPDATE_AVAILABLE, title: UPDATE_TITLE, type: 'info' }),
      ])
    })

    it('does not show when the app is current', () => {
      mockServerStatus(noUpdate)

      const { result } = renderBanners({ scope: BannersScope.Auth })

      expect(result.current.banners).toEqual([])
    })

    it('does not show when the server status is unavailable', () => {
      mockServerStatus(null)

      const { result } = renderBanners({ scope: BannersScope.Auth })

      expect(result.current.banners).toEqual([])
    })

    it('opens the app store and hides the banner when pressed', () => {
      mockServerStatus(optionalUpdate)
      const openLinkSpy = jest.spyOn(links, 'openLink').mockResolvedValue(undefined)
      const { result } = renderBanners({ scope: BannersScope.Auth })

      act(() => {
        result.current.banners[0].onPress?.()
      })

      expect(openLinkSpy).toHaveBeenCalledWith(links.getBCSCAppStoreUrl())
      expect(result.current.banners).toEqual([])
    })

    it('stays hidden while the dismissal duration is still running', () => {
      mockServerStatus(optionalUpdate)
      jest.spyOn(Date, 'now').mockReturnValue(1000 + UPDATE_DISMISS_MS - 1)

      const { result } = renderBanners(
        { scope: BannersScope.Auth },
        { dismissedBanners: { [BCSCBanner.APP_UPDATE_AVAILABLE]: { dismissedAt: 1000 } } }
      )

      expect(result.current.banners).toEqual([])
    })

    it('shows again once the dismissal duration has ended', () => {
      mockServerStatus(optionalUpdate)
      jest.spyOn(Date, 'now').mockReturnValue(1000 + UPDATE_DISMISS_MS)

      const { result } = renderBanners(
        { scope: BannersScope.Auth },
        { dismissedBanners: { [BCSCBanner.APP_UPDATE_AVAILABLE]: { dismissedAt: 1000 } } }
      )

      expect(titles(result.current.banners)).toEqual([UPDATE_TITLE])
    })
  })

  describe('device limit banner', () => {
    it('shows on Home when the device count is over the limit', () => {
      mockServerStatus(noUpdate)

      const { result } = renderBanners(
        { scope: BannersScope.Home, onDeviceLimitPress: jest.fn() },
        { idToken: overLimitIdToken }
      )

      expect(result.current.banners).toEqual([
        expect.objectContaining({
          id: BCSCBanner.DEVICE_LIMIT_EXCEEDED,
          title: DEVICE_LIMIT_TITLE,
          type: 'warning',
          dismissible: false,
        }),
      ])
    })

    it('calls onDeviceLimitPress when pressed', () => {
      mockServerStatus(noUpdate)
      const onDeviceLimitPress = jest.fn()
      const { result } = renderBanners({ scope: BannersScope.Home, onDeviceLimitPress }, { idToken: overLimitIdToken })

      result.current.banners[0].onPress?.()

      expect(onDeviceLimitPress).toHaveBeenCalledTimes(1)
    })

    it('does not show on the auth scope, even when over the limit', () => {
      mockServerStatus(noUpdate)

      const { result } = renderBanners({ scope: BannersScope.Auth }, { idToken: overLimitIdToken })

      expect(result.current.banners).toEqual([])
    })

    it('does not show when the device count is under the limit', () => {
      mockServerStatus(noUpdate)

      const { result } = renderBanners(
        { scope: BannersScope.Home, onDeviceLimitPress: jest.fn() },
        { idToken: underLimitIdToken }
      )

      expect(result.current.banners).toEqual([])
    })

    it('does not show when there is no id token', () => {
      mockServerStatus(noUpdate)

      const { result } = renderBanners({ scope: BannersScope.Home, onDeviceLimitPress: jest.fn() })

      expect(result.current.banners).toEqual([])
    })

    it('stays hidden while the dismissal cooldown is running', () => {
      mockServerStatus(noUpdate)
      jest.spyOn(Date, 'now').mockReturnValue(1000 + DEVICE_LIMIT_DISMISS_MS - 1)

      const { result } = renderBanners(
        { scope: BannersScope.Home, onDeviceLimitPress: jest.fn() },
        { idToken: overLimitIdToken, dismissedBanners: { [BCSCBanner.DEVICE_LIMIT_EXCEEDED]: { dismissedAt: 1000 } } }
      )

      expect(result.current.banners).toEqual([])
    })

    it('shows again once the dismissal cooldown has ended', () => {
      mockServerStatus(noUpdate)
      jest.spyOn(Date, 'now').mockReturnValue(1000 + DEVICE_LIMIT_DISMISS_MS)

      const { result } = renderBanners(
        { scope: BannersScope.Home, onDeviceLimitPress: jest.fn() },
        { idToken: overLimitIdToken, dismissedBanners: { [BCSCBanner.DEVICE_LIMIT_EXCEEDED]: { dismissedAt: 1000 } } }
      )

      expect(titles(result.current.banners)).toEqual([DEVICE_LIMIT_TITLE])
    })
  })

  it('lists the update banner before the device limit banner on Home', () => {
    mockServerStatus(optionalUpdate)

    const { result } = renderBanners(
      { scope: BannersScope.Home, onDeviceLimitPress: jest.fn() },
      { idToken: overLimitIdToken }
    )

    expect(titles(result.current.banners)).toEqual([UPDATE_TITLE, DEVICE_LIMIT_TITLE])
  })

  it('returns the device limit in the metadata', () => {
    mockServerStatus(noUpdate)

    const { result } = renderBanners(
      { scope: BannersScope.Home, onDeviceLimitPress: jest.fn() },
      { idToken: overLimitIdToken }
    )

    expect(result.current.metadata.deviceLimit).toEqual({ limit: 'over', deviceLimit: 3, deviceCount: 4 })
  })
})
