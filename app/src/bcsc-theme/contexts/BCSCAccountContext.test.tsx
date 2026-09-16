import { AppError } from '@/errors/appError'
import { ErrorRegistry } from '@/errors/errorRegistry'
import { BCSCEventTypes } from '@/events/eventTypes'
import { BCSCSecureState, initialBCSCSecureState, VerificationStatus } from '@/store'
import { BasicAppContext } from '@mocks/helpers/app'
import NetInfo, { NetInfoChangeHandler } from '@react-native-community/netinfo'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import React from 'react'
import { AppState, DeviceEventEmitter } from 'react-native'

// Unmock BCSCAccountContext so we get the real provider and hook
jest.unmock('./BCSCAccountContext')

const mockGetUserMetadata = jest.fn()

jest.mock('../services/hooks/useUserService', () => ({
  useUserService: jest.fn(() => ({
    getUserMetadata: mockGetUserMetadata,
  })),
}))

// AppError reads the current screen from navigationRef at construction time
jest.mock('@/contexts/NavigationContainerContext', () => ({
  navigationRef: {
    isReady: () => true,
    getCurrentRoute: () => ({ name: 'Home' }),
  },
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
    given_names: 'Steve John',
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

const unverified: BCSCSecureState = { ...initialBCSCSecureState }

// A realistic verified account: verified flag true, and (as in production) a refresh token
const verified: BCSCSecureState = {
  ...initialBCSCSecureState,
  verified: true,
  verifiedStatus: VerificationStatus.VERIFIED,
  refreshToken: 'stored-refresh',
}

// Token-backed transfer state: refresh token present, no local credential yet
const transferred: BCSCSecureState = {
  ...initialBCSCSecureState,
  refreshToken: 'stored-refresh',
  verifiedStatus: VerificationStatus.UNVERIFIED,
}

const deactivatedTransfer: BCSCSecureState = {
  ...initialBCSCSecureState,
  refreshToken: 'stored-refresh',
  verifiedStatus: VerificationStatus.DEACTIVATED,
}

const renderAccount = (bcscSecure: BCSCSecureState) => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BasicAppContext initialStateOverride={{ bcscSecure }}>
      <BCSCAccountProvider>{children}</BCSCAccountProvider>
    </BasicAppContext>
  )

  return renderHook(() => useAccount(), { wrapper })
}

describe('BCSCAccountContext', () => {
  let netInfoListeners: NetInfoChangeHandler[]

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUserMetadata.mockReset()
    // react-native's jest mock leaves AppState.currentState as an empty jest.fn(); set it to
    // the real-world default so appState diagnostics reflect an actual AppStateStatus.
    ;(AppState as unknown as { currentState: string }).currentState = 'active'
    netInfoListeners = []
    ;(NetInfo.addEventListener as jest.Mock).mockImplementation((listener: NetInfoChangeHandler) => {
      netInfoListeners.push(listener)
      return jest.fn()
    })
  })

  // Invokes every registered NetInfo listener (there can be more than one across
  // re-subscriptions), matching what the real NetInfo module would broadcast.
  const emitNetInfo = (isConnected: boolean, isInternetReachable: boolean | null = isConnected) => {
    act(() => {
      netInfoListeners.forEach((listener) => listener({ isConnected, isInternetReachable } as any))
    })
  }

  describe('unverified user', () => {
    it('does not call the user API on mount', () => {
      const { result } = renderAccount(unverified)

      expect(mockGetUserMetadata).not.toHaveBeenCalled()
      expect(result.current.account).toBeNull()
    })

    it('makes no authenticated call across repeated reconnects', () => {
      renderAccount(unverified)

      emitNetInfo(false)
      emitNetInfo(true)
      emitNetInfo(false)
      emitNetInfo(true, null)
      emitNetInfo(false)
      emitNetInfo(true)

      expect(mockGetUserMetadata).not.toHaveBeenCalled()
    })

    it('does not call the user API when tokens are refreshed', () => {
      renderAccount(unverified)

      act(() => {
        DeviceEventEmitter.emit(BCSCEventTypes.TOKENS_REFRESHED)
      })

      expect(mockGetUserMetadata).not.toHaveBeenCalled()
    })
  })

  describe('verified user', () => {
    beforeEach(() => {
      mockGetUserMetadata.mockResolvedValue(mockUserData())
    })

    it('loads the account once on mount', async () => {
      const { result } = renderAccount(verified)

      await waitFor(() => expect(result.current.account).not.toBeNull())

      expect(mockGetUserMetadata).toHaveBeenCalledTimes(1)
    })

    describe('fullname_formatted', () => {
      it('formats as "FamilyName, GivenName" when both names are present', async () => {
        mockGetUserMetadata.mockResolvedValue(mockUserData())

        const { result } = renderAccount(verified)

        await waitFor(() => expect(result.current.account?.fullname_formatted).toBe('Brule, Steve John'))
      })

      it('formats as "FamilyName" when given_name is undefined (mononym)', async () => {
        mockGetUserMetadata.mockResolvedValue(mockUserData({ given_names: undefined }))

        const { result } = renderAccount(verified)

        await waitFor(() => expect(result.current.account?.fullname_formatted).toBe('Brule'))
      })

      it('formats as "FamilyName" when given_name is an empty string', async () => {
        mockGetUserMetadata.mockResolvedValue(mockUserData({ given_names: '' }))

        const { result } = renderAccount(verified)

        await waitFor(() => expect(result.current.account?.fullname_formatted).toBe('Brule'))
      })

      it('formats as "FamilyName" when given_name is whitespace only', async () => {
        mockGetUserMetadata.mockResolvedValue(mockUserData({ given_names: '   ' }))

        const { result } = renderAccount(verified)

        await waitFor(() => expect(result.current.account?.fullname_formatted).toBe('Brule'))
      })

      it('formats as "GivenName" when family_name is undefined', async () => {
        mockGetUserMetadata.mockResolvedValue(mockUserData({ family_name: undefined }))

        const { result } = renderAccount(verified)

        await waitFor(() => expect(result.current.account?.fullname_formatted).toBe('Steve John'))
      })

      it('formats as "GivenName" when family_name is an empty string', async () => {
        mockGetUserMetadata.mockResolvedValue(mockUserData({ family_name: '' }))

        const { result } = renderAccount(verified)

        await waitFor(() => expect(result.current.account?.fullname_formatted).toBe('Steve John'))
      })
    })

    it('retries once on reconnect after a failed initial load, then stops retrying once loaded', async () => {
      mockGetUserMetadata.mockReset()
      mockGetUserMetadata.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(mockUserData())

      const { result } = renderAccount(verified)

      await waitFor(() => expect(mockGetUserMetadata).toHaveBeenCalledTimes(1))
      expect(result.current.account).toBeNull()

      emitNetInfo(false)
      emitNetInfo(true, null)

      await waitFor(() => expect(mockGetUserMetadata).toHaveBeenCalledTimes(2))
      await waitFor(() => expect(result.current.account).not.toBeNull())

      // Data is now loaded, so further reconnects should not trigger another call
      emitNetInfo(false)
      emitNetInfo(true)

      expect(mockGetUserMetadata).toHaveBeenCalledTimes(2)
    })

    it('attaches load diagnostics to a reconnect failure without leaking the refresh token', async () => {
      mockGetUserMetadata.mockReset()
      mockGetUserMetadata.mockRejectedValueOnce(new Error('offline'))

      renderAccount(verified)

      await waitFor(() => expect(mockGetUserMetadata).toHaveBeenCalledTimes(1))

      const tokenNullError = AppError.fromErrorDefinition(ErrorRegistry.TOKEN_NULL)
      mockGetUserMetadata.mockRejectedValueOnce(tokenNullError)

      emitNetInfo(false)
      emitNetInfo(true, null)

      await waitFor(() => expect(mockGetUserMetadata).toHaveBeenCalledTimes(2))
      await waitFor(() => expect(tokenNullError.context.accountLoad).toBeDefined())

      expect(tokenNullError.context.accountLoad).toEqual({
        trigger: 'reconnect',
        screen: 'Home',
        navigationReady: true,
        appState: 'active',
        connectivity: { isConnected: true, isInternetReachable: null },
        verified: true,
        verifiedStatus: VerificationStatus.VERIFIED,
        hasRefreshToken: true,
      })
      expect(JSON.stringify(tokenNullError.toJSON())).not.toContain('stored-refresh')
    })

    it('refreshAccount() reloads with trigger "manual"', async () => {
      mockGetUserMetadata.mockReset()
      mockGetUserMetadata.mockResolvedValueOnce(mockUserData())

      const { result } = renderAccount(verified)

      await waitFor(() => expect(result.current.account).not.toBeNull())

      const manualError = AppError.fromErrorDefinition(ErrorRegistry.TOKEN_NULL)
      mockGetUserMetadata.mockRejectedValueOnce(manualError)

      act(() => {
        result.current.refreshAccount()
      })

      await waitFor(() => expect(manualError.context.accountLoad).toMatchObject({ trigger: 'manual' }))
    })
  })

  describe('token-backed transfer state (no local credential yet)', () => {
    it('loads the account for a transferred (unverified but token-backed) user', async () => {
      mockGetUserMetadata.mockResolvedValueOnce(mockUserData())

      renderAccount(transferred)

      await waitFor(() => expect(mockGetUserMetadata).toHaveBeenCalledTimes(1))
    })

    it('does not load the account once the transferred credential is deactivated', () => {
      renderAccount(deactivatedTransfer)

      expect(mockGetUserMetadata).not.toHaveBeenCalled()
    })

    // The transferred fixture has no `verified` flag set (isUserVerified() allows the load
    // through via the refresh token instead), so this pins the diagnostics' `verified` field
    // to the raw legacy flag rather than the already-gated isUserVerified() result - the two
    // are indistinguishable on the `verified` fixture used elsewhere in this file.
    it('records the raw (unset) verified flag for a token-backed transfer load failure', async () => {
      const tokenNullError = AppError.fromErrorDefinition(ErrorRegistry.TOKEN_NULL)
      mockGetUserMetadata.mockRejectedValueOnce(tokenNullError)

      renderAccount(transferred)

      await waitFor(() => expect(tokenNullError.context.accountLoad).toBeDefined())

      expect(tokenNullError.context.accountLoad).toMatchObject({
        trigger: 'initial',
        verified: false,
        verifiedStatus: VerificationStatus.UNVERIFIED,
        hasRefreshToken: true,
      })
    })
  })
})
