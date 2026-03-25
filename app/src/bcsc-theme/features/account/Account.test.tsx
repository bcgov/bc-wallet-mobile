import { useAccount } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { useQuickLoginURL } from '@/bcsc-theme/hooks/useQuickLoginUrl'
import * as useAlertsModule from '@/hooks/useAlerts'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import Account from './Account'

jest.mock('@/bcsc-theme/contexts/BCSCAccountContext', () => ({
  useAccount: jest.fn(),
}))

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

const mockedUseQuickLoginURL = useQuickLoginURL as jest.MockedFunction<typeof useQuickLoginURL>

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
    mockedUseAccount.mockReturnValue({
      account: null,
      isLoadingAccount: false,
      refreshAccount: jest.fn(),
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders full name when both given_name and family_name are present', () => {
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
      isLoadingAccount: false,
      refreshAccount: jest.fn(),
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
      account: {
        given_name: undefined,
        family_name: 'Madonna',
        birthdate: '1958-08-16',
        card_expiry: '2025-12-31',
        picture: null,
        fullname_formatted: 'Madonna',
        account_expiration_date: new Date('2025-12-31'),
      },
      isLoadingAccount: false,
      refreshAccount: jest.fn(),
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
      account: {
        given_name: '',
        family_name: 'Cher',
        birthdate: '1946-05-20',
        card_expiry: '2025-12-31',
        picture: null,
        fullname_formatted: 'Cher',
        account_expiration_date: new Date('2025-12-31'),
      },
      isLoadingAccount: false,
      refreshAccount: jest.fn(),
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
      account: {
        given_name: 'Prince',
        family_name: undefined,
        birthdate: '1958-06-07',
        card_expiry: '2025-12-31',
        picture: null,
        fullname_formatted: 'Prince',
        account_expiration_date: new Date('2025-12-31'),
      },
      isLoadingAccount: false,
      refreshAccount: jest.fn(),
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

  describe('handleAllAccountDetailsPress', () => {
    const mockAccount = {
      given_name: 'Test',
      family_name: 'User',
      birthdate: '1990-01-01',
      card_expiry: '2025-12-31',
      picture: null,
      fullname_formatted: 'User, Test',
      account_expiration_date: new Date('2025-12-31'),
    }

    const useDataLoader = require('@/bcsc-theme/hooks/useDataLoader').default as jest.Mock

    beforeEach(() => {
      mockedUseAccount.mockReturnValue({
        account: mockAccount,
        isLoadingAccount: false,
        refreshAccount: jest.fn(),
      } as any)
    })

    it('should show loginServerErrorAlert when quick login returns an error result', async () => {
      const mockLoginServerErrorAlert = jest.fn()
      jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue({
        loginServerErrorAlert: mockLoginServerErrorAlert,
      } as any)

      const mockGetQuickLoginURL = jest.fn().mockResolvedValue({ success: false, error: 'No access token' })
      mockedUseQuickLoginURL.mockReturnValue(mockGetQuickLoginURL)
      useDataLoader.mockReturnValue({
        data: { client_ref_id: 'bcsc-client', initiate_login_uri: 'https://example.com' },
        load: jest.fn(),
        isLoading: false,
      })

      const tree = render(
        <BasicAppContext>
          <Account />
        </BasicAppContext>
      )

      fireEvent.press(tree.getByTestId('com.ariesbifold:id/AllAccountDetails'))
      await waitFor(() => expect(mockLoginServerErrorAlert).toHaveBeenCalled())
    })

    it('should show loginServerErrorAlert when quick login throws', async () => {
      const mockLoginServerErrorAlert = jest.fn()
      jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue({
        loginServerErrorAlert: mockLoginServerErrorAlert,
      } as any)

      const mockGetQuickLoginURL = jest.fn().mockRejectedValue(new Error('network failure'))
      mockedUseQuickLoginURL.mockReturnValue(mockGetQuickLoginURL)
      useDataLoader.mockReturnValue({
        data: { client_ref_id: 'bcsc-client', initiate_login_uri: 'https://example.com' },
        load: jest.fn(),
        isLoading: false,
      })

      const tree = render(
        <BasicAppContext>
          <Account />
        </BasicAppContext>
      )

      fireEvent.press(tree.getByTestId('com.ariesbifold:id/AllAccountDetails'))
      await waitFor(() => expect(mockLoginServerErrorAlert).toHaveBeenCalled())
    })
  })
})
