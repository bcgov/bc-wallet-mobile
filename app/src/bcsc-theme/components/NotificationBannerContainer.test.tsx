import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { BCSCBanner, BCSCBannerMessage } from './AppBanner'
import { NotificationBannerContainer } from './NotificationBannerContainer'

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

describe('NotificationBannerContainer', () => {
  const onManageDevices = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all banners when excludeBanners is not provided', () => {
    const tree = render(
      <BasicAppContext
        initialStateOverride={{ bcsc: { bannerMessages: [deviceLimitBanner, serverNotificationBanner] } as any }}
      >
        <NotificationBannerContainer onManageDevices={onManageDevices} />
      </BasicAppContext>
    )

    expect(tree.getByText('Device limit reached')).toBeTruthy()
    expect(tree.getByText('Server notification')).toBeTruthy()
  })

  it('filters out banners whose ids are in excludeBanners', () => {
    const tree = render(
      <BasicAppContext
        initialStateOverride={{ bcsc: { bannerMessages: [deviceLimitBanner, serverNotificationBanner] } as any }}
      >
        <NotificationBannerContainer
          onManageDevices={onManageDevices}
          excludeBanners={[BCSCBanner.DEVICE_LIMIT_EXCEEDED]}
        />
      </BasicAppContext>
    )

    expect(tree.queryByText('Device limit reached')).toBeNull()
    expect(tree.getByText('Server notification')).toBeTruthy()
  })

  it('treats an empty excludeBanners array as no-op', () => {
    const tree = render(
      <BasicAppContext initialStateOverride={{ bcsc: { bannerMessages: [serverNotificationBanner] } as any }}>
        <NotificationBannerContainer onManageDevices={onManageDevices} excludeBanners={[]} />
      </BasicAppContext>
    )

    expect(tree.getByText('Server notification')).toBeTruthy()
  })

  it('invokes the banner press handler when a banner is tapped', () => {
    const tree = render(
      <BasicAppContext initialStateOverride={{ bcsc: { bannerMessages: [serverNotificationBanner] } as any }}>
        <NotificationBannerContainer onManageDevices={onManageDevices} />
      </BasicAppContext>
    )

    fireEvent.press(tree.getByText('Server notification'))
    // Dismissible banner should be removed from the visible tree after press.
    expect(tree.queryByText('Server notification')).toBeNull()
  })
})
