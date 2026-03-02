import { BasicAppContext } from '@mocks/helpers/app'
import { renderHook } from '@testing-library/react-native'
import React from 'react'

// Unmock BCSCAccountContext so we get the real provider and hook
jest.unmock('./BCSCAccountContext')

// Mock dependencies
const mockLoad = jest.fn()
const mockRefresh = jest.fn()
let mockDataLoaderReturn: any = {
  data: undefined,
  error: undefined,
  isLoading: false,
  isReady: false,
  load: mockLoad,
  refresh: mockRefresh,
  clear: jest.fn(),
  setData: jest.fn(),
}

jest.mock('../hooks/useDataLoader', () => ({
  __esModule: true,
  default: jest.fn(() => mockDataLoaderReturn),
}))

jest.mock('../services/hooks/useUserService', () => ({
  useUserService: jest.fn(() => ({
    getUserMetadata: jest.fn(),
  })),
}))

// Import after mocks are set up
import { BCSCAccountProvider, useAccount } from './BCSCAccountContext'

const mockUserData = (overrides: Record<string, any> = {}) => ({
  user: {
    identity_assurance_level: '3',
    credential_reference: 'ref',
    sub: 'sub-123',
    transaction_identifier: 'txn-123',
    given_name: 'Steve',
    family_name: 'Brule',
    display_name: 'Steve Brule',
    birthdate: '1990-01-01',
    gender: 'male',
    address: { formatted: '123 Main St' },
    picture: 'https://example.com/photo.jpg',
    card_type: 'BC Services Card',
    card_expiry: 'December 31, 2025',
    ...overrides,
  },
  picture: 'file:///photo.jpg',
})

describe('BCSCAccountContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDataLoaderReturn = {
      data: undefined,
      error: undefined,
      isLoading: false,
      isReady: false,
      load: mockLoad,
      refresh: mockRefresh,
      clear: jest.fn(),
      setData: jest.fn(),
    }
  })

  describe('fullname_formatted', () => {
    it('formats as "FamilyName, GivenName" when both names are present', () => {
      mockDataLoaderReturn.data = mockUserData()

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <BasicAppContext>
          <BCSCAccountProvider>{children}</BCSCAccountProvider>
        </BasicAppContext>
      )

      const { result } = renderHook(() => useAccount(), { wrapper })

      expect(result.current.fullname_formatted).toBe('Brule, Steve')
    })

    it('formats as "FamilyName" when given_name is undefined (mononym)', () => {
      mockDataLoaderReturn.data = mockUserData({ given_name: undefined })

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <BasicAppContext>
          <BCSCAccountProvider>{children}</BCSCAccountProvider>
        </BasicAppContext>
      )

      const { result } = renderHook(() => useAccount(), { wrapper })

      expect(result.current.fullname_formatted).toBe('Brule')
    })

    it('formats as "FamilyName" when given_name is an empty string', () => {
      mockDataLoaderReturn.data = mockUserData({ given_name: '' })

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <BasicAppContext>
          <BCSCAccountProvider>{children}</BCSCAccountProvider>
        </BasicAppContext>
      )

      const { result } = renderHook(() => useAccount(), { wrapper })

      expect(result.current.fullname_formatted).toBe('Brule')
    })

    it('formats as "FamilyName" when given_name is whitespace only', () => {
      mockDataLoaderReturn.data = mockUserData({ given_name: '   ' })

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <BasicAppContext>
          <BCSCAccountProvider>{children}</BCSCAccountProvider>
        </BasicAppContext>
      )

      const { result } = renderHook(() => useAccount(), { wrapper })

      expect(result.current.fullname_formatted).toBe('Brule')
    })

    it('formats as "GivenName" when family_name is undefined', () => {
      mockDataLoaderReturn.data = mockUserData({ family_name: undefined })

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <BasicAppContext>
          <BCSCAccountProvider>{children}</BCSCAccountProvider>
        </BasicAppContext>
      )

      const { result } = renderHook(() => useAccount(), { wrapper })

      expect(result.current.fullname_formatted).toBe('Steve')
    })

    it('formats as "GivenName" when family_name is an empty string', () => {
      mockDataLoaderReturn.data = mockUserData({ family_name: '' })

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <BasicAppContext>
          <BCSCAccountProvider>{children}</BCSCAccountProvider>
        </BasicAppContext>
      )

      const { result } = renderHook(() => useAccount(), { wrapper })

      expect(result.current.fullname_formatted).toBe('Steve')
    })
  })
})
