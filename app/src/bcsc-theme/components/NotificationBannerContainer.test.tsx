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

  it('hides a dismissible banner after it is pressed', () => {
    const tree = render(
      <BasicAppContext>
        <NotificationBannerContainer onManageDevices={onManageDevices} bannerMessages={[serverNotificationBanner]} />
      </BasicAppContext>
    )

    fireEvent.press(tree.getByText('Server notification'))
    expect(tree.queryByText('Server notification')).toBeNull()
  })
})
