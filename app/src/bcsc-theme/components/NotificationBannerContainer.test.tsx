import { BCState } from '@/store'
import { getBCSCAppStoreUrl, openLink } from '@/utils/links'
import { useStore } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { Text } from 'react-native'
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

const updateAvailableBanner: BCSCBannerMessage = {
  id: BCSCBanner.APP_UPDATE_AVAILABLE,
  title: 'Update available',
  type: 'info',
  dismissible: true,
}

const updateAvailableState = { bcsc: { bannerMessages: [updateAvailableBanner] } } as unknown as Partial<BCState>

const StoredBannerIds = () => {
  const [store] = useStore<BCState>()
  return <Text testID="stored-banner-ids">{store.bcsc.bannerMessages.map((banner) => banner.id).join(',')}</Text>
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

  it('opens the app store and removes the banner when the update banner is pressed', () => {
    const tree = render(
      <BasicAppContext initialStateOverride={updateAvailableState}>
        <NotificationBannerContainer onManageDevices={onManageDevices} bannerMessages={[updateAvailableBanner]} />
        <StoredBannerIds />
      </BasicAppContext>
    )

    expect(tree.getByTestId('stored-banner-ids').props.children).toBe(BCSCBanner.APP_UPDATE_AVAILABLE)

    fireEvent.press(tree.getByText('Update available'))

    expect(getBCSCAppStoreUrl).toHaveBeenCalled()
    expect(openLink).toHaveBeenCalledWith('https://example.com/store')
    expect(tree.getByTestId('stored-banner-ids').props.children).toBe('')
  })
})
