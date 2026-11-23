import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCLocalStorageKeys } from '@/store'
import { BasicAppContext } from '@mocks/helpers/app'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { fireEvent, render, RenderResult, waitFor } from '@testing-library/react-native'
import React from 'react'
import { AccountSecurityMethod, verifyPIN } from 'react-native-bcsc-core'
import { EnterPINScreen } from './EnterPINScreen'

const mockHandleSuccessfulAuth = jest.fn()

jest.mock('@/bcsc-theme/contexts/BCSCLoadingContext', () => ({
  useLoadingScreen: () => ({ startLoading: jest.fn(() => jest.fn()) }),
}))

jest.mock('@/bcsc-theme/hooks/useSecureActions', () => ({
  __esModule: true,
  default: () => ({
    handleSuccessfulAuth: mockHandleSuccessfulAuth,
  }),
}))

const mockVerifyPIN = jest.mocked(verifyPIN)

// BasicAppContext resets the store, so the account goes in through it
const accountSeed = {
  account: {
    profile: {
      accountId: 'test-account-id',
      clientId: 'test-client-id',
      issuer: 'https://idsit.gov.bc.ca/device/',
      securityMethod: AccountSecurityMethod.PinNoDeviceAuth,
    },
  },
}

const mockNavigation = { navigate: jest.fn(), dispatch: jest.fn() } as any

// The lockout service is the real one here: only the native PIN check and device storage are mocked
describe('EnterPINScreen with the lockout service', () => {
  beforeEach(async () => {
    jest.useFakeTimers()
    await AsyncStorage.removeItem(BCLocalStorageKeys.PinAttempts)
    mockVerifyPIN.mockResolvedValue({ success: false })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  const renderScreen = () =>
    render(
      <BasicAppContext bcscState={accountSeed}>
        <EnterPINScreen navigation={mockNavigation} />
      </BasicAppContext>
    )

  /** Types a full PIN, which submits it, and waits for the native check to have run `checks` times */
  const enterPIN = async (tree: RenderResult, pin: string, checks: number) => {
    const input = tree.getByA11yHint('Enter your 6-digit PIN')

    fireEvent.changeText(input, '')
    fireEvent.changeText(input, pin)

    await waitFor(() => expect(mockVerifyPIN).toHaveBeenCalledTimes(checks))
  }

  it('warns after the fourth wrong PIN in a row and locks on the fifth', async () => {
    const tree = renderScreen()

    for (let attempt = 1; attempt <= 3; attempt++) {
      await enterPIN(tree, `00000${attempt}`, attempt)
      await waitFor(() => expect(tree.getByText('BCSC.EnterPIN.IncorrectPIN')).toBeTruthy())
    }
    expect(tree.queryByText('BCSC.EnterPIN.LastAttemptWarning')).toBeNull()

    await enterPIN(tree, '000004', 4)
    await waitFor(() => expect(tree.getByText('BCSC.EnterPIN.LastAttemptWarning')).toBeTruthy())
    expect(mockNavigation.dispatch).not.toHaveBeenCalled()

    await enterPIN(tree, '000005', 5)
    await waitFor(() =>
      expect(mockNavigation.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'RESET',
          payload: expect.objectContaining({ routes: [{ name: BCSCScreens.Lockout }] }),
        })
      )
    )
    expect(mockHandleSuccessfulAuth).not.toHaveBeenCalled()
  })

  it('refuses a sixth PIN while locked without checking it', async () => {
    const tree = renderScreen()

    for (let attempt = 1; attempt <= 5; attempt++) {
      await enterPIN(tree, `00000${attempt}`, attempt)
    }
    await waitFor(() => expect(mockNavigation.dispatch).toHaveBeenCalledTimes(1))
    mockVerifyPIN.mockResolvedValue({ success: true, walletKey: 'wallet-key' })

    const input = tree.getByA11yHint('Enter your 6-digit PIN')
    fireEvent.changeText(input, '')
    fireEvent.changeText(input, '123456')

    await waitFor(() => expect(mockNavigation.dispatch).toHaveBeenCalledTimes(2))
    expect(mockVerifyPIN).toHaveBeenCalledTimes(5)
    expect(mockHandleSuccessfulAuth).not.toHaveBeenCalled()
  })

  it('unlocks with a correct PIN and forgets the wrong ones before it', async () => {
    const tree = renderScreen()

    for (let attempt = 1; attempt <= 3; attempt++) {
      await enterPIN(tree, `00000${attempt}`, attempt)
    }
    mockVerifyPIN.mockResolvedValue({ success: true, walletKey: 'wallet-key' })

    await enterPIN(tree, '123456', 4)

    await waitFor(() => expect(mockHandleSuccessfulAuth).toHaveBeenCalledWith('wallet-key'))
    expect((await AsyncStorage.getItem(BCLocalStorageKeys.PinAttempts)) ?? null).toBeNull()
    expect(mockNavigation.dispatch).not.toHaveBeenCalled()
  })
})
