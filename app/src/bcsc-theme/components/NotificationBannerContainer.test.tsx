import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { openLink } from '@/utils/links'
import { BasicAppContext } from '@mocks/helpers/app'
import { useNavigation } from '@react-navigation/native'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { BCSCBanner, BCSCBannerMessage } from './AppBanner'
import { NotificationBannerContainer } from './NotificationBannerContainer'

jest.mock('@/utils/links', () => ({
  openLink: jest.fn(),
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
})
