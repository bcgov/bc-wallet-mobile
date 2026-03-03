import { useAccount } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import Home from './Home'

jest.mock('@/bcsc-theme/hooks/useBCSCApiClient', () => ({
  useBCSCApiClient: jest.fn(() => ({
    endpoints: {
      accountDevices: 'https://example.com/devices',
    },
  })),
  useBCSCApiClientState: jest.fn(() => ({})),
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
      given_name: 'Steve',
      family_name: 'Brule',
      birthdate: '1990-01-01',
      card_expiry: '2025-12-31',
      picture: null,
      fullname_formatted: 'Brule, Steve',
      account_expiration_date: new Date('2025-12-31'),
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
      given_name: undefined,
      family_name: 'Madonna',
      birthdate: '1958-08-16',
      card_expiry: '2025-12-31',
      picture: null,
      fullname_formatted: 'Madonna',
      account_expiration_date: new Date('2025-12-31'),
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
      given_name: '',
      family_name: 'Cher',
      birthdate: '1946-05-20',
      card_expiry: '2025-12-31',
      picture: null,
      fullname_formatted: 'Cher',
      account_expiration_date: new Date('2025-12-31'),
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
      given_name: 'Prince',
      family_name: undefined,
      birthdate: '1958-06-07',
      card_expiry: '2025-12-31',
      picture: null,
      fullname_formatted: 'Prince',
      account_expiration_date: new Date('2025-12-31'),
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
