import { BCSCApiClientContext } from '@/bcsc-theme/contexts/BCSCApiClientContext'
import { BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { getBCSCState, useApp } from '@/bcsc-theme/storage/hooks'
import { nativeAccount, seedAccount, type BCSCStoreSeed } from '@/bcsc-theme/storage/testing'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { AccountSetupType, BCState, initialState } from '@/store'
import { TestIds } from '@/test-ids/registry'
import { testIdWithKey } from '@bifold/core'
import { useNavigation as getMockNavigation, useFocusEffect } from '@mocks/@react-navigation/native'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, fireEvent, render, waitFor, within } from '@testing-library/react-native'
import React, { useEffect } from 'react'
import { Text } from 'react-native'
import { getDynamicClientRegistrationBody, setAuthorizationRequest } from 'react-native-bcsc-core'
import AccountSetupScreen from './AccountSetupScreen'

// Spies on cycleRegistration specifically while keeping the rest of the real hook (ensureRegistered,
// etc.) intact, so the other tests in this file keep exercising real hook composition.
const mockCycleRegistration = jest.fn().mockResolvedValue(undefined)
// The real ensureRegistered unless a test gives this an implementation
const mockEnsureRegistered = jest.fn()
jest.mock('@/bcsc-theme/services/hooks/useRegistrationService', () => {
  const actual = jest.requireActual('@/bcsc-theme/services/hooks/useRegistrationService')
  return {
    ...actual,
    useRegistrationService: (...args: unknown[]) => {
      const real = actual.useRegistrationService(...args)
      return {
        ...real,
        cycleRegistration: mockCycleRegistration,
        ensureRegistered: mockEnsureRegistered.getMockImplementation() ? mockEnsureRegistered : real.ensureRegistered,
      }
    },
  }
})

/** Exposes the current account setup type in the tree so tests can observe store updates. */
const SetupTypeProbe = () => {
  const accountSetupType = useApp((s) => s.accountSetupType)
  return <Text testID="SetupTypeProbe">{String(accountSetupType)}</Text>
}

const mockNavigation = getMockNavigation() as never
const mockNavigate = (mockNavigation as unknown as { navigate: jest.Mock }).navigate

const renderScreen = (stateOverride?: Partial<BCState>, bcscState?: BCSCStoreSeed) => {
  return render(
    <BasicAppContext initialStateOverride={stateOverride} bcscState={bcscState}>
      <BCSCLoadingProvider>
        <AccountSetupScreen navigation={mockNavigation} />
        <SetupTypeProbe />
      </BCSCLoadingProvider>
    </BasicAppContext>
  )
}

// An account not registered yet, with a ready client, so ensureRegistered runs the real registration up to the
// registration body
const unregisteredAccount: BCSCStoreSeed = {
  account: {
    profile: {
      accountId: 'test-account-id',
      clientId: '',
      issuer: 'https://idsit.gov.bc.ca/device/',
      securityMethod: 'app_pin_no_device_authn' as never,
    },
  },
}
const readyClient = { client: { endpoints: {} } as never, isClientReady: true, error: null }

const renderUnregistered = () =>
  render(
    <BasicAppContext bcscState={unregisteredAccount}>
      <BCSCApiClientContext.Provider value={readyClient}>
        <BCSCLoadingProvider>
          <AccountSetupScreen navigation={mockNavigation} />
          <SetupTypeProbe />
        </BCSCLoadingProvider>
      </BCSCApiClientContext.Provider>
    </BasicAppContext>
  )

// The loading overlay hides the screen (and itself when idle), so queries must look at hidden elements
const hidden = { includeHiddenElements: true }

describe('AccountSetup', () => {
  const focusEffectMock = useFocusEffect as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockEnsureRegistered.mockReset()
    jest.useFakeTimers()
    // Run the focus callback as an effect, emulating the screen gaining focus after render
    focusEffectMock.mockImplementation((callback: () => void) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useEffect(callback, [callback])
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <BCSCLoadingProvider>
          <AccountSetupScreen navigation={mockNavigation} />
        </BCSCLoadingProvider>
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('clears an abandoned transfer choice and its device authorization on focus', async () => {
    let deviceCodeWhenCycled: string | undefined
    mockCycleRegistration.mockImplementationOnce(async () => {
      deviceCodeWhenCycled = getBCSCState().verification.request?.deviceCode
    })
    const { getByTestId } = renderScreen(
      { bcsc: { ...initialState.bcsc, accountSetupType: AccountSetupType.TransferAccount } },
      {
        verification: {
          request: {
            issuer: 'issuer',
            clientID: 'client-id',
            deviceCode: 'transfer-device-code',
            userCode: 'transfer-user-code',
            expiry: 1234567890,
          },
        },
      }
    )

    await waitFor(() => {
      expect(getByTestId('SetupTypeProbe').props.children).toBe('undefined')
      expect(getBCSCState().verification.request?.deviceCode).toBeUndefined()
    })

    // Device/user codes are dropped from the persisted authorization request; the rest survives
    expect(getBCSCState().verification.request).toEqual({ issuer: 'issuer', clientID: 'client-id' })

    // The stale IAS registration must be cycled — not just the local device code cleared —
    // otherwise a later regular-verification attempt on the same client_id would still conflict.
    expect(mockCycleRegistration).toHaveBeenCalledTimes(1)
    expect(deviceCodeWhenCycled).toBe('transfer-device-code')
  })

  it('keeps the device authorization when the ID step has progress', async () => {
    const { getByTestId } = renderScreen({
      bcsc: { ...initialState.bcsc, accountSetupType: AccountSetupType.TransferAccount },
      bcscSecure: { ...initialState.bcscSecure, deviceCode: 'card-device-code', serial: 'serial' },
    })

    await waitFor(() => {
      expect(getByTestId('SetupTypeProbe').props.children).toBe('undefined')
    })

    expect(getBCSCState().verification.request?.deviceCode).toBe('card-device-code')
    expect(mockCycleRegistration).not.toHaveBeenCalled()
  })

  it('leaves a non-transfer setup choice untouched on focus', async () => {
    const { getByTestId } = renderScreen({
      bcsc: { ...initialState.bcsc, accountSetupType: AccountSetupType.AddAccount },
    })

    await waitFor(() => {
      expect(getByTestId('SetupTypeProbe').props.children).toBe(AccountSetupType.AddAccount)
    })

    expect(setAuthorizationRequest).not.toHaveBeenCalled()
  })

  it('dispatches AddAccount and navigates to IdentitySelection when "Add Account" is pressed', async () => {
    const { getByTestId } = renderScreen({
      bcscSecure: { ...initialState.bcscSecure, registrationAccessToken: 'existing-token' },
    })
    const overlay = () => getByTestId(testIdWithKey(TestIds.common.loadingOverlay), hidden)

    fireEvent.press(getByTestId(testIdWithKey('AddAccount')))

    // A registered device has nothing to wait for, so the overlay never goes up to flash over the slide
    expect(overlay().props.accessible).toBe(false)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(BCSCScreens.IdentitySelection)
    })

    expect(overlay().props.accessible).toBe(false)
    expect(getByTestId('SetupTypeProbe').props.children).toBe(AccountSetupType.AddAccount)
  })

  it('dispatches TransferAccount and navigates to TransferAccountInstructions when "Transfer Account" is pressed', async () => {
    const { getByTestId } = renderScreen({
      bcscSecure: { ...initialState.bcscSecure, registrationAccessToken: 'existing-token' },
    })
    const overlay = () => getByTestId(testIdWithKey(TestIds.common.loadingOverlay), hidden)

    fireEvent.press(getByTestId(testIdWithKey('TransferAccount')))

    expect(overlay().props.accessible).toBe(false)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(BCSCScreens.TransferAccountInstructions)
    })

    expect(overlay().props.accessible).toBe(false)
    expect(getByTestId('SetupTypeProbe').props.children).toBe(AccountSetupType.TransferAccount)
  })

  it('does not navigate to IdentitySelection when ensureRegistered fails for Add Account', async () => {
    jest.mocked(getDynamicClientRegistrationBody).mockRejectedValueOnce(new Error('registration boom'))

    const { getByTestId } = renderUnregistered()

    fireEvent.press(getByTestId(testIdWithKey('AddAccount')))

    await waitFor(() => {
      expect(getDynamicClientRegistrationBody).toHaveBeenCalled()
    })

    expect(mockNavigate).not.toHaveBeenCalledWith(BCSCScreens.IdentitySelection)
  })

  it('does not navigate to TransferAccountInstructions when ensureRegistered fails for Transfer Account', async () => {
    jest.mocked(getDynamicClientRegistrationBody).mockRejectedValueOnce(new Error('registration boom'))

    const { getByTestId } = renderUnregistered()

    fireEvent.press(getByTestId(testIdWithKey('TransferAccount')))

    await waitFor(() => {
      expect(getDynamicClientRegistrationBody).toHaveBeenCalled()
    })

    expect(mockNavigate).not.toHaveBeenCalledWith(BCSCScreens.TransferAccountInstructions)
  })

  describe.each([
    {
      name: 'Add Account',
      buttonId: 'AddAccount',
      setupType: AccountSetupType.AddAccount,
      destination: BCSCScreens.IdentitySelection,
    },
    {
      name: 'Transfer Account',
      buttonId: 'TransferAccount',
      setupType: AccountSetupType.TransferAccount,
      destination: BCSCScreens.TransferAccountInstructions,
    },
  ])('registration before saving the setup choice ($name)', ({ buttonId, setupType, destination }) => {
    it('waits on the pressed button, overlay down, with nothing saved while registering', async () => {
      let settle: (error: Error) => void = () => {}
      jest.mocked(getDynamicClientRegistrationBody).mockReturnValueOnce(
        new Promise((_resolve, reject) => {
          settle = reject
        })
      )
      const { getByTestId } = renderUnregistered()

      fireEvent.press(getByTestId(testIdWithKey(buttonId)))

      await waitFor(() => {
        expect(getDynamicClientRegistrationBody).toHaveBeenCalled()
        expect(within(getByTestId(testIdWithKey(buttonId))).getByTestId(testIdWithKey('ButtonLoading'))).toBeTruthy()
      })
      // The wait stays inside the card, so the slide to the next step starts from this screen rather
      // than from behind the overlay; both choices are locked until it ends
      expect(getByTestId(testIdWithKey(TestIds.common.loadingOverlay), hidden).props.accessible).toBe(false)
      expect(getByTestId(testIdWithKey('AddAccount'))).toBeDisabled()
      expect(getByTestId(testIdWithKey('TransferAccount'))).toBeDisabled()
      expect(getByTestId('SetupTypeProbe').props.children).toBe('undefined')
      expect(mockNavigate).not.toHaveBeenCalled()

      await act(async () => {
        settle(new Error('registration boom'))
      })
    })

    it('unlocks the buttons and saves nothing when registration fails, then succeeds on retry', async () => {
      jest.mocked(getDynamicClientRegistrationBody).mockRejectedValueOnce(new Error('registration boom'))
      const { getByTestId, queryByTestId } = renderUnregistered()
      const button = () => getByTestId(testIdWithKey(buttonId))

      fireEvent.press(button())

      await waitFor(() => {
        expect(getDynamicClientRegistrationBody).toHaveBeenCalled()
        expect(button()).not.toBeDisabled()
      })
      expect(queryByTestId(testIdWithKey('ButtonLoading'))).toBeNull()
      expect(getByTestId('SetupTypeProbe').props.children).toBe('undefined')
      expect(mockNavigate).not.toHaveBeenCalled()

      // Registered in the meantime, so the retry has nothing to register
      seedAccount(nativeAccount({ clientID: 'client-id' }))

      fireEvent.press(button())

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(destination)
      })
      expect(getByTestId('SetupTypeProbe', hidden).props.children).toBe(setupType)
    })

    it('saves nothing and stays put when the screen lost focus during registration', async () => {
      // Back stays live while the button waits, so a user can leave before registration lands
      const isFocused = jest
        .spyOn(mockNavigation as unknown as { isFocused: () => boolean }, 'isFocused')
        .mockReturnValue(false)
      mockEnsureRegistered.mockImplementation(async () => undefined)
      const { getByTestId } = renderUnregistered()
      const button = () => getByTestId(testIdWithKey(buttonId))

      fireEvent.press(button())

      await waitFor(() => {
        expect(mockEnsureRegistered).toHaveBeenCalled()
        expect(button()).not.toBeDisabled()
      })
      expect(getByTestId('SetupTypeProbe').props.children).toBe('undefined')
      expect(mockNavigate).not.toHaveBeenCalled()
      isFocused.mockRestore()
    })
  })
})
