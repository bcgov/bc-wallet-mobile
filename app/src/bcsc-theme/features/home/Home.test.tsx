import { useAccount } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { initialState } from '@/store'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import DefaultHome from './Home'

jest.mock('@/bcsc-theme/contexts/BCSCAccountContext')

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
})
