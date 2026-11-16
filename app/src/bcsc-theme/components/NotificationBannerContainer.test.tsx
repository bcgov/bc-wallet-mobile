import * as ServerStatusContext from '@/bcsc-theme/contexts/ServerStatusContext'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { getBCSCAppStoreUrl, openLink } from '@/utils/links'
import { BasicAppContext } from '@mocks/helpers/app'
import { useNavigation } from '@react-navigation/native'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { BCSCBanner, BCSCBannerMessage } from './AppBanner'
import { NotificationBannerContainer } from './NotificationBannerContainer'

jest.mock('@/utils/links', () => ({
  openLink: jest.fn(),
  getBCSCAppStoreUrl: jest.fn(() => 'https://example.com/store'),
}))

const deviceLimitBanner: BCSCBannerMessage = {
  id: BCSCBanner.DEVICE_LIMIT_EXCEEDED,
  title: 'Device limit reached',
  type: 'warning',
  dismissible: false,
}

const serverNotificationBanner: BCSCBannerMessage = {
  id: BCSCBanner.IAS_SERVER_NOTIFICATION,
  title: 'Server notification',
  type: 'info',
  dismissible: true,
}

const serviceNoticeBanner: BCSCBannerMessage = {
  id: BCSCBanner.IAS_SERVER_NOTIFICATION,
  title: 'Service notice. Learn more.',
  type: 'warning',
  dismissible: false,
}

const serverUnavailableBanner: BCSCBannerMessage = {
  id: BCSCBanner.IAS_SERVER_UNAVAILABLE,
  title: undefined,
  description: 'Down for maintenance',
  type: 'info',
  dismissible: false,
  metadata: { contactLink: 'https://example.com/contact-us.html' },
}

describe('NotificationBannerContainer', () => {
  const onManageDevices = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the banners passed via bannerMessages', () => {
    const tree = render(
      <BasicAppContext>
        <NotificationBannerContainer
          onManageDevices={onManageDevices}
          bannerMessages={[deviceLimitBanner, serverNotificationBanner]}
        />
      </BasicAppContext>
    )

    expect(tree.getByText('Device limit reached')).toBeTruthy()
    expect(tree.getByText('Server notification')).toBeTruthy()
  })

  it('renders nothing when bannerMessages is empty', () => {
    const tree = render(
      <BasicAppContext>
        <NotificationBannerContainer onManageDevices={onManageDevices} bannerMessages={[]} />
      </BasicAppContext>
    )

    expect(tree.queryByText('Device limit reached')).toBeNull()
    expect(tree.queryByText('Server notification')).toBeNull()
  })

  it('only renders banners the caller provides', () => {
    const tree = render(
      <BasicAppContext>
        <NotificationBannerContainer onManageDevices={onManageDevices} bannerMessages={[serverNotificationBanner]} />
      </BasicAppContext>
    )

    expect(tree.queryByText('Device limit reached')).toBeNull()
    expect(tree.getByText('Server notification')).toBeTruthy()
  })

  it('renders banners in severity order regardless of prop order', () => {
    const tree = render(
      <BasicAppContext>
        <NotificationBannerContainer
          onManageDevices={onManageDevices}
          bannerMessages={[serverNotificationBanner, deviceLimitBanner]}
        />
      </BasicAppContext>
    )

    const titles = tree.getAllByTestId(/text-(error|warning|info|success)$/).map((node) => node.props.children)

    expect(titles).toEqual(['Device limit reached', 'Server notification'])
  })

  it('hides a dismissible banner after it is pressed', () => {
    const tree = render(
      <BasicAppContext>
        <NotificationBannerContainer onManageDevices={onManageDevices} bannerMessages={[serverNotificationBanner]} />
      </BasicAppContext>
    )

    fireEvent.press(tree.getByText('Server notification'))
    expect(tree.queryByText('Server notification')).toBeNull()
  })

  it('opens the service notice screen when the notice banner is pressed', () => {
    const tree = render(
      <BasicAppContext>
        <NotificationBannerContainer onManageDevices={onManageDevices} bannerMessages={[serviceNoticeBanner]} />
      </BasicAppContext>
    )

    fireEvent.press(tree.getByText('Service notice. Learn more.'))

    expect(useNavigation().navigate).toHaveBeenCalledWith(BCSCScreens.ServiceNotice)
    expect(openLink).not.toHaveBeenCalled()
    // The notice stays up for as long as IAS reports it
    expect(tree.getByText('Service notice. Learn more.')).toBeTruthy()
  })

  it('opens the contact link when the outage banner is pressed', () => {
    const tree = render(
      <BasicAppContext>
        <NotificationBannerContainer onManageDevices={onManageDevices} bannerMessages={[serverUnavailableBanner]} />
      </BasicAppContext>
    )

    fireEvent.press(tree.getByText('Down for maintenance'))

    expect(openLink).toHaveBeenCalledWith('https://example.com/contact-us.html')
    expect(useNavigation().navigate).not.toHaveBeenCalled()
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
          <NotificationBannerContainer onManageDevices={onManageDevices} bannerMessages={[]} />
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
          onManageDevices={onManageDevices}
          bannerMessages={[{ id: BCSCBanner.APP_UPDATE_AVAILABLE, title: 'Stored update', type: 'info' }]}
        />
      </BasicAppContext>
    )

    expect(tree.queryByText('Stored update')).toBeNull()
  })
})
