import * as ServerStatusContext from '@/bcsc-theme/contexts/ServerStatusContext'
import { BannersScope } from '@/bcsc-theme/hooks/useBanners'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { getBCSCAppStoreUrl, openLink } from '@/utils/links'
import { BasicAppContext } from '@mocks/helpers/app'
import { useNavigation } from '@react-navigation/native'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { BCSCBanner } from './AppBanner'
import { NotificationBannerContainer } from './NotificationBannerContainer'

jest.mock('@/utils/links', () => ({
  openLink: jest.fn(),
  getBCSCAppStoreUrl: jest.fn(() => 'https://example.com/store'),
}))

// The device-limit banner is derived from the id token, not saved in the store
const overLimitIdToken = { bcsc_devices_count: 4, bcsc_max_devices: 3 }
const deviceLimitTitle = 'BCSC.SystemChecks.Devices.DeviceLimitReachedBannerTitle'

const NOTICE_TITLE = 'BCSC.SystemChecks.ServerStatus.NoticeBannerTitle'
const OUTAGE_MESSAGE = 'Down for maintenance'
const CONTACT_LINK = 'https://example.com/contact-us.html'

const serverStatusValue = (overrides: Partial<ServerStatusContext.ServerStatusContextType> = {}) => ({
  isAvailable: true,
  serverStatus: null,
  isChecking: false,
  hasChecked: true,
  refresh: jest.fn(),
  ...overrides,
})

describe('NotificationBannerContainer', () => {
  const onManageDevices = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders the device-limit banner from the id token and a service notice from the server status', () => {
    jest
      .spyOn(ServerStatusContext, 'useServerStatus')
      .mockReturnValue(serverStatusValue({ statusMessage: 'Scheduled maintenance' }))

    const tree = render(
      <BasicAppContext idTokenOverride={overLimitIdToken}>
        <NotificationBannerContainer scope={BannersScope.Home} onManageDevices={onManageDevices} />
      </BasicAppContext>
    )

    expect(tree.getByText(deviceLimitTitle)).toBeTruthy()
    expect(tree.getByText(NOTICE_TITLE)).toBeTruthy()
  })

  it('renders nothing when there is nothing to report', () => {
    const tree = render(
      <BasicAppContext>
        <NotificationBannerContainer scope={BannersScope.Home} onManageDevices={onManageDevices} />
      </BasicAppContext>
    )

    expect(tree.queryByText(deviceLimitTitle)).toBeNull()
    expect(tree.queryByText(NOTICE_TITLE)).toBeNull()
  })

  it('does not render the device-limit banner when the id token is unavailable', () => {
    jest
      .spyOn(ServerStatusContext, 'useServerStatus')
      .mockReturnValue(serverStatusValue({ statusMessage: 'Scheduled maintenance' }))

    const tree = render(
      <BasicAppContext>
        <NotificationBannerContainer scope={BannersScope.Home} onManageDevices={onManageDevices} />
      </BasicAppContext>
    )

    expect(tree.queryByText(deviceLimitTitle)).toBeNull()
    expect(tree.getByText(NOTICE_TITLE)).toBeTruthy()
  })

  it('does not render the device-limit banner on the auth scope, even when over the limit', () => {
    const tree = render(
      <BasicAppContext idTokenOverride={overLimitIdToken}>
        <NotificationBannerContainer scope={BannersScope.Auth} />
      </BasicAppContext>
    )

    expect(tree.queryByText(deviceLimitTitle)).toBeNull()
  })

  it('renders the service notice on the auth scope', () => {
    jest
      .spyOn(ServerStatusContext, 'useServerStatus')
      .mockReturnValue(serverStatusValue({ statusMessage: 'Scheduled maintenance' }))

    const tree = render(
      <BasicAppContext>
        <NotificationBannerContainer scope={BannersScope.Auth} />
      </BasicAppContext>
    )

    expect(tree.getByText(NOTICE_TITLE)).toBeTruthy()
  })

  it('renders banners in severity order, not the order useBanners builds them', () => {
    // The update banner is built before the device-limit banner but is only 'info'
    jest
      .spyOn(ServerStatusContext, 'useServerStatus')
      .mockReturnValue(
        serverStatusValue({ serverStatus: { minVersion: '100', supportedVersions: ['4.0.0', '4.1.0'] } as any })
      )

    const tree = render(
      <BasicAppContext idTokenOverride={overLimitIdToken}>
        <NotificationBannerContainer scope={BannersScope.Home} onManageDevices={onManageDevices} />
      </BasicAppContext>
    )

    const titles = tree.getAllByTestId(/text-(error|warning|info|success)$/).map((node) => node.props.children)

    expect(titles).toEqual([deviceLimitTitle, 'BCSC.SystemChecks.UpdateApp.UpdateAvailableBannerTitle'])
  })

  it('opens the service notice screen when the notice banner is pressed', () => {
    jest
      .spyOn(ServerStatusContext, 'useServerStatus')
      .mockReturnValue(serverStatusValue({ statusMessage: 'Scheduled maintenance' }))

    const tree = render(
      <BasicAppContext>
        <NotificationBannerContainer scope={BannersScope.Home} onManageDevices={onManageDevices} />
      </BasicAppContext>
    )

    fireEvent.press(tree.getByText(NOTICE_TITLE))

    expect(useNavigation().navigate).toHaveBeenCalledWith(BCSCScreens.ServiceNotice)
    expect(openLink).not.toHaveBeenCalled()
    // The notice stays up for as long as IAS reports it
    expect(tree.getByText(NOTICE_TITLE)).toBeTruthy()
  })

  it('opens the contact link and re-checks the server when the outage banner is pressed', () => {
    const refresh = jest.fn()
    jest
      .spyOn(ServerStatusContext, 'useServerStatus')
      .mockReturnValue(
        serverStatusValue({ isAvailable: false, statusMessage: OUTAGE_MESSAGE, contactLink: CONTACT_LINK, refresh })
      )

    const tree = render(
      <BasicAppContext>
        <NotificationBannerContainer scope={BannersScope.Home} onManageDevices={onManageDevices} />
      </BasicAppContext>
    )

    fireEvent.press(tree.getByText(OUTAGE_MESSAGE))

    expect(openLink).toHaveBeenCalledWith(CONTACT_LINK)
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(useNavigation().navigate).not.toHaveBeenCalled()
    // The outage stays up until the server is back
    expect(tree.getByText(OUTAGE_MESSAGE)).toBeTruthy()
  })

  it('falls back to the unavailable title when the outage has no message', () => {
    jest.spyOn(ServerStatusContext, 'useServerStatus').mockReturnValue(serverStatusValue({ isAvailable: false }))

    const tree = render(
      <BasicAppContext>
        <NotificationBannerContainer scope={BannersScope.Home} onManageDevices={onManageDevices} />
      </BasicAppContext>
    )

    expect(tree.getByText('BCSC.SystemChecks.ServerStatus.UnavailableBannerTitle')).toBeTruthy()
  })

  it('does not render a server banner while the server status is unknown', () => {
    jest
      .spyOn(ServerStatusContext, 'useServerStatus')
      .mockReturnValue(serverStatusValue({ isAvailable: null, statusMessage: 'Stale' }))

    const tree = render(
      <BasicAppContext>
        <NotificationBannerContainer scope={BannersScope.Home} onManageDevices={onManageDevices} />
      </BasicAppContext>
    )

    expect(tree.queryByText(NOTICE_TITLE)).toBeNull()
    expect(tree.queryByText('Stale')).toBeNull()
  })

  it('opens the app store and hides the banner when the derived update banner is pressed', () => {
    const serverStatusSpy = jest.spyOn(ServerStatusContext, 'useServerStatus').mockReturnValue({
      isAvailable: true,
      serverStatus: { minVersion: '100', supportedVersions: ['4.0.0', '4.1.0'] } as any,
      isChecking: false,
      hasChecked: true,
      refresh: jest.fn(),
    })

    try {
      const tree = render(
        <BasicAppContext>
          <NotificationBannerContainer
            scope={BannersScope.Home}
            onManageDevices={onManageDevices}
            bannerMessages={[]}
          />
        </BasicAppContext>
      )

      fireEvent.press(tree.getByText('BCSC.SystemChecks.UpdateApp.UpdateAvailableBannerTitle'))

      expect(getBCSCAppStoreUrl).toHaveBeenCalled()
      expect(openLink).toHaveBeenCalledWith('https://example.com/store')
      expect(useNavigation().navigate).not.toHaveBeenCalled()
      expect(tree.queryByText('BCSC.SystemChecks.UpdateApp.UpdateAvailableBannerTitle')).toBeNull()
    } finally {
      serverStatusSpy.mockRestore()
    }
  })

  it('ignores a stored update banner because useBanners owns it', () => {
    const tree = render(
      <BasicAppContext>
        <NotificationBannerContainer
          scope={BannersScope.Home}
          onManageDevices={onManageDevices}
          bannerMessages={[{ id: BCSCBanner.APP_UPDATE_AVAILABLE, title: 'Stored update', type: 'info' }]}
        />
      </BasicAppContext>
    )

    expect(tree.queryByText('Stored update')).toBeNull()
  })
})
