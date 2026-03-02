import { useAccount } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import Account from './Account'

jest.mock('@/bcsc-theme/contexts/BCSCIdTokenContext', () => ({
  useIdToken: jest.fn(() => ({
    idToken: { bcsc_devices_count: 2 },
    isLoading: false,
    refreshIdToken: jest.fn(),
  })),
}))

jest.mock('@/bcsc-theme/hooks/useQuickLoginUrl', () => ({
  useQuickLoginURL: jest.fn(() => jest.fn()),
}))

jest.mock('@/bcsc-theme/hooks/useDataLoader', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    data: undefined,
    load: jest.fn(),
    isLoading: false,
  })),
}))

jest.mock('@/bcsc-theme/api/hooks/useApi', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    metadata: {
      getBCSCClientMetadata: jest.fn(),
    },
  })),
}))

const mockedUseAccount = useAccount as jest.MockedFunction<typeof useAccount>

describe('Account', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders full name when both given_name and family_name are present', () => {
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
        <Account />
      </BasicAppContext>
    )

    expect(tree.getByText('Brule, Steve')).toBeTruthy()
    expect(tree).toMatchSnapshot()
  })

  it('renders only family_name when given_name is undefined (mononym)', () => {
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
        <Account />
      </BasicAppContext>
    )

    expect(tree.getByText('Madonna')).toBeTruthy()
    // Ensure "undefined" does not appear anywhere in the rendered output
    expect(tree.queryByText(/undefined/i)).toBeNull()
    expect(tree).toMatchSnapshot()
  })

  it('renders only family_name when given_name is empty string (mononym)', () => {
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
        <Account />
      </BasicAppContext>
    )

    expect(tree.getByText('Cher')).toBeTruthy()
    expect(tree.queryByText(/undefined/i)).toBeNull()
    expect(tree).toMatchSnapshot()
  })

  it('renders only given_name when family_name is undefined', () => {
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
        <Account />
      </BasicAppContext>
    )

    expect(tree.getByText('Prince')).toBeTruthy()
    expect(tree.queryByText(/undefined/i)).toBeNull()
    expect(tree).toMatchSnapshot()
  })
})
