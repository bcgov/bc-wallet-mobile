import { BCSCBanner, BCSCBannerMessage } from '@/bcsc-theme/components/AppBanner'
import { useAccount } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { initialState } from '@/store'
import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import DefaultHome, { HomeV4_0_x as Home } from './Home'

jest.mock('@/bcsc-theme/hooks/useBCSCApiClient', () => ({
  useBCSCApiClient: jest.fn(() => ({
    endpoints: {
      accountDevices: 'https://example.com/devices',
    },
  })),
  useBCSCApiClientState: jest.fn(() => ({})),
}))

jest.mock('@/hooks/notifications', () => ({
  useNotifications: () => [],
}))

jest.mock('@/hooks/useCustomNotifications', () => ({
  useCustomNotifications: () => ({ customNotifications: [] }),
}))

const mockedUseAccount = useAccount as jest.MockedFunction<typeof useAccount>

describe('Home', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders full name in header when both names are present', () => {
    mockedUseAccount.mockReturnValue({
      account: {
        given_name: 'Steve',
        family_name: 'Brule',
        birthdate: '1990-01-01',
        card_expiry: '2025-12-31',
        picture: null,
        fullname_formatted: 'Brule, Steve',
        account_expiration_date: new Date('2025-12-31'),
      },
    } as any)

    const tree = render(
      <BasicAppContext>
        <Home navigation={mockNavigation} route={{ key: 'home', name: 'Home' } as any} />
      </BasicAppContext>
    )

    expect(tree.getByText('Brule, Steve')).toBeTruthy()
    expect(tree).toMatchSnapshot()
  })

  it('renders only family_name in header when given_name is undefined (mononym)', () => {
    mockedUseAccount.mockReturnValue({
      account: {
        given_name: undefined,
        family_name: 'Madonna',
        birthdate: '1958-08-16',
        card_expiry: '2025-12-31',
        picture: null,
        fullname_formatted: 'Madonna',
        account_expiration_date: new Date('2025-12-31'),
      },
    } as any)

    const tree = render(
      <BasicAppContext>
        <Home navigation={mockNavigation} route={{ key: 'home', name: 'Home' } as any} />
      </BasicAppContext>
    )

    expect(tree.getByText('Madonna')).toBeTruthy()
    expect(tree.queryByText(/undefined/i)).toBeNull()
    expect(tree).toMatchSnapshot()
  })

  it('renders only family_name in header when given_name is empty string (mononym)', () => {
    mockedUseAccount.mockReturnValue({
      account: {
        given_name: '',
        family_name: 'Cher',
        birthdate: '1946-05-20',
        card_expiry: '2025-12-31',
        picture: null,
        fullname_formatted: 'Cher',
        account_expiration_date: new Date('2025-12-31'),
      },
    } as any)

    const tree = render(
      <BasicAppContext>
        <Home navigation={mockNavigation} route={{ key: 'home', name: 'Home' } as any} />
      </BasicAppContext>
    )

    expect(tree.getByText('Cher')).toBeTruthy()
    expect(tree.queryByText(/undefined/i)).toBeNull()
    expect(tree).toMatchSnapshot()
  })

  it('renders only given_name in header when family_name is undefined', () => {
    mockedUseAccount.mockReturnValue({
      account: {
        given_name: 'Prince',
        family_name: undefined,
        birthdate: '1958-06-07',
        card_expiry: '2025-12-31',
        picture: null,
        fullname_formatted: 'Prince',
        account_expiration_date: new Date('2025-12-31'),
      },
    } as any)

    const tree = render(
      <BasicAppContext>
        <Home navigation={mockNavigation} route={{ key: 'home', name: 'Home' } as any} />
      </BasicAppContext>
    )

    expect(tree.getByText('Prince')).toBeTruthy()
    expect(tree.queryByText(/undefined/i)).toBeNull()
    expect(tree).toMatchSnapshot()
  })
})

describe('Home (default export, v4.1)', () => {
  let mockNavigation: any

  const deviceLimitBanner: BCSCBannerMessage = {
    id: BCSCBanner.DEVICE_LIMIT_EXCEEDED,
    title: 'Device limit reached',
    type: 'warning',
    dismissible: false,
  }

  const accountRemovedBanner: BCSCBannerMessage = {
    id: BCSCBanner.REMOVE_ACCOUNT_SUCCESS,
    title: 'Account removed successfully.',
    type: 'success',
    dismissible: true,
  }

  const serverNotificationBanner: BCSCBannerMessage = {
    id: BCSCBanner.IAS_SERVER_NOTIFICATION,
    title: 'Server notification',
    type: 'info',
    dismissible: true,
  }

  const renderHome = (bannerMessages: BCSCBannerMessage[]) =>
    render(
      <BasicAppContext initialStateOverride={{ bcsc: { ...initialState.bcsc, bannerMessages } }}>
        <DefaultHome navigation={mockNavigation} route={{ key: 'home', name: 'Home' } as any} />
      </BasicAppContext>
    )

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
  })

  it('renders the device-limit and account-removed banners on Home', () => {
    const tree = renderHome([deviceLimitBanner, accountRemovedBanner])

    expect(tree.getByText('Device limit reached')).toBeTruthy()
    expect(tree.getByText('Account removed successfully.')).toBeTruthy()
  })

  it('renders a server notification banner on Home', () => {
    const tree = renderHome([serverNotificationBanner])

    expect(tree.getByText('Server notification')).toBeTruthy()
  })

  it('renders no banners and still shows the empty-notifications copy when bannerMessages is empty', () => {
    const tree = renderHome([])

    expect(tree.queryByText('Device limit reached')).toBeNull()
    expect(tree.queryByText('Account removed successfully.')).toBeNull()
    expect(tree.queryByText('Server notification')).toBeNull()
    expect(tree.getByText('Notification.EmptyNotification.Title')).toBeTruthy()
  })

  it('shows the ReviewDevices modal content when the device-limit banner is tapped', () => {
    const tree = renderHome([deviceLimitBanner])

    expect(tree.queryByText('BCSC.SystemChecks.Devices.ReviewDevicesTitle')).toBeNull()

    fireEvent.press(tree.getByText('Device limit reached'))

    expect(tree.getByText('BCSC.SystemChecks.Devices.ReviewDevicesTitle')).toBeTruthy()

    fireEvent.press(tree.getByText('BCSC.SystemChecks.Devices.ManageDevicesButton'))

    expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.MainWebView, {
      url: 'https://example.com/devices',
      title: 'BCSC.Screens.ManageDevices',
    })
  })
})

describe('Home (default export, v4.1) — verification gating', () => {
  let mockNavigation: any

  const activelyVerifiedAccount = {
    given_name: 'John',
    family_name: 'Doe',
    fullname_formatted: 'Doe, John',
    // Far-future expiry so the account is verified AND not expired (isActivelyVerified === true).
    account_expiration_date: new Date('2999-12-31'),
  }

  const renderHome = (verified: boolean) =>
    render(
      <BasicAppContext initialStateOverride={{ bcscSecure: { ...initialState.bcscSecure, verified } }}>
        <DefaultHome navigation={mockNavigation} route={{ key: 'home', name: 'Home' } as any} />
      </BasicAppContext>
    )

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    mockedUseAccount.mockReturnValue({ account: activelyVerifiedAccount } as any)
  })

  it('shows the welcome header and pairing shortcut when actively verified', () => {
    const tree = renderHome(true)

    expect(tree.getByText('BCSC.Home.Welcome')).toBeTruthy()
    expect(tree.getByText('Doe, John')).toBeTruthy()
    expect(tree.getByText('BCSC.Home.LogInFromComputerTitle')).toBeTruthy()
  })

  it('hides the welcome header and pairing shortcut when the user is not verified', () => {
    const tree = renderHome(false)

    expect(tree.queryByText('BCSC.Home.Welcome')).toBeNull()
    expect(tree.queryByText('Doe, John')).toBeNull()
    expect(tree.queryByText('BCSC.Home.LogInFromComputerTitle')).toBeNull()
    // Notifications remain visible regardless of verification state.
    expect(tree.getByText('Notification.EmptyNotification.Title')).toBeTruthy()
  })

  it('shows the loading screen while a verified account is still loading', () => {
    mockedUseAccount.mockReturnValue({ account: null, isLoadingAccount: true } as any)

    const tree = renderHome(true)

    expect(tree.getByTestId(testIdWithKey('LoadingScreenContent'))).toBeTruthy()
    // No partial home content renders underneath the loading screen.
    expect(tree.queryByText('BCSC.Home.LogInFromComputerTitle')).toBeNull()
    expect(tree.queryByText('Notification.EmptyNotification.Title')).toBeNull()
  })
})
