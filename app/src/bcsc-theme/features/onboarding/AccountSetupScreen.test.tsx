import { BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { AccountSetupType, BCState, initialState } from '@/store'
import { TestIds } from '@/test-ids/registry'
import { testIdWithKey, useStore } from '@bifold/core'
import { useNavigation as getMockNavigation, useFocusEffect } from '@mocks/@react-navigation/native'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import React, { useEffect } from 'react'
import { Text } from 'react-native'
import {
  getAccount,
  getAccountSecurityMethod,
  getAuthorizationRequest,
  setAuthorizationRequest,
} from 'react-native-bcsc-core'
import AccountSetupScreen from './AccountSetupScreen'

// Spies on cycleRegistration specifically while keeping the rest of the real hook (ensureRegistered,
// etc.) intact, so the other tests in this file keep exercising real hook composition.
const mockCycleRegistration = jest.fn().mockResolvedValue(undefined)
jest.mock('@/bcsc-theme/services/hooks/useRegistrationService', () => {
  const actual = jest.requireActual('@/bcsc-theme/services/hooks/useRegistrationService')
  return {
    ...actual,
    useRegistrationService: (...args: unknown[]) => ({
      ...actual.useRegistrationService(...args),
      cycleRegistration: mockCycleRegistration,
    }),
  }
})

/** Exposes the current account setup type in the tree so tests can observe store updates. */
const SetupTypeProbe = () => {
  const [store] = useStore<BCState>()
  return <Text testID="SetupTypeProbe">{String(store.bcsc.accountSetupType)}</Text>
}

const mockNavigation = getMockNavigation() as never
const mockNavigate = (mockNavigation as unknown as { navigate: jest.Mock }).navigate

const renderScreen = (stateOverride?: Partial<BCState>) => {
  return render(
    <BasicAppContext initialStateOverride={stateOverride}>
      <BCSCLoadingProvider>
        <AccountSetupScreen navigation={mockNavigation} />
        <SetupTypeProbe />
      </BCSCLoadingProvider>
    </BasicAppContext>
  )
}

// The loading overlay hides the screen (and itself when idle), so queries must look at hidden elements
const hidden = { includeHiddenElements: true }

describe('AccountSetup', () => {
  const focusEffectMock = useFocusEffect as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
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
    const getAuthorizationRequestMock = getAuthorizationRequest as jest.Mock
    getAuthorizationRequestMock.mockResolvedValue({
      issuer: 'issuer',
      clientID: 'client-id',
      deviceCode: 'transfer-device-code',
      userCode: 'transfer-user-code',
      expiry: 1234567890,
    })

    const { getByTestId } = renderScreen({
      bcsc: { ...initialState.bcsc, accountSetupType: AccountSetupType.TransferAccount },
      bcscSecure: { ...initialState.bcscSecure, deviceCode: 'transfer-device-code' },
    })

    await waitFor(() => {
      expect(getByTestId('SetupTypeProbe').props.children).toBe('undefined')
      expect(setAuthorizationRequest).toHaveBeenCalledTimes(1)
    })

    // Device/user codes are dropped from the persisted authorization request; the rest survives
    expect(setAuthorizationRequest).toHaveBeenCalledWith({ issuer: 'issuer', clientID: 'client-id' })

    // The stale IAS registration must be cycled — not just the local device code cleared —
    // otherwise a later regular-verification attempt on the same client_id would still conflict.
    expect(mockCycleRegistration).toHaveBeenCalledTimes(1)
    const cycleOrder = mockCycleRegistration.mock.invocationCallOrder[0]
    const clearOrder = (setAuthorizationRequest as jest.Mock).mock.invocationCallOrder[0]
    expect(cycleOrder).toBeLessThan(clearOrder)
  })

  it('keeps the device authorization when the ID step has progress', async () => {
    const { getByTestId } = renderScreen({
      bcsc: { ...initialState.bcsc, accountSetupType: AccountSetupType.TransferAccount },
      bcscSecure: { ...initialState.bcscSecure, deviceCode: 'card-device-code', serial: 'serial' },
    })

    await waitFor(() => {
      expect(getByTestId('SetupTypeProbe').props.children).toBe('undefined')
    })

    expect(getAuthorizationRequest).not.toHaveBeenCalled()
    expect(setAuthorizationRequest).not.toHaveBeenCalled()
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

    fireEvent.press(getByTestId(testIdWithKey('AddAccount')))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(BCSCScreens.IdentitySelection)
    })

    expect(getByTestId('SetupTypeProbe').props.children).toBe(AccountSetupType.AddAccount)
  })

  it('dispatches TransferAccount and navigates to TransferAccountInstructions when "Transfer Account" is pressed', async () => {
    const { getByTestId } = renderScreen({
      bcscSecure: { ...initialState.bcscSecure, registrationAccessToken: 'existing-token' },
    })

    fireEvent.press(getByTestId(testIdWithKey('TransferAccount')))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(BCSCScreens.TransferAccountInstructions)
    })

    expect(getByTestId('SetupTypeProbe').props.children).toBe(AccountSetupType.TransferAccount)
  })

  it('does not navigate to IdentitySelection when ensureRegistered fails for Add Account', async () => {
    const getAccountSecurityMethodMock = getAccountSecurityMethod as jest.Mock
    getAccountSecurityMethodMock.mockRejectedValueOnce(new Error('registration boom'))

    const { getByTestId } = renderScreen()

    fireEvent.press(getByTestId(testIdWithKey('AddAccount')))

    await waitFor(() => {
      expect(getAccountSecurityMethodMock).toHaveBeenCalled()
    })

    expect(mockNavigate).not.toHaveBeenCalledWith(BCSCScreens.IdentitySelection)
  })

  it('does not navigate to TransferAccountInstructions when ensureRegistered fails for Transfer Account', async () => {
    const getAccountSecurityMethodMock = getAccountSecurityMethod as jest.Mock
    getAccountSecurityMethodMock.mockRejectedValueOnce(new Error('registration boom'))

    const { getByTestId } = renderScreen()

    fireEvent.press(getByTestId(testIdWithKey('TransferAccount')))

    await waitFor(() => {
      expect(getAccountSecurityMethodMock).toHaveBeenCalled()
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
    it('keeps the choice unsaved and the loading overlay up while registration is pending', async () => {
      let settle: (method: any) => void = () => {}
      jest.mocked(getAccountSecurityMethod).mockReturnValueOnce(
        new Promise((resolve) => {
          settle = resolve
        })
      )
      const { getByTestId } = renderScreen()

      fireEvent.press(getByTestId(testIdWithKey(buttonId)))

      await waitFor(() => {
        expect(getByTestId(testIdWithKey(TestIds.common.loadingOverlay), hidden).props.accessible).toBe(true)
      })
      expect(getByTestId('SetupTypeProbe', hidden).props.children).toBe('undefined')
      expect(mockNavigate).not.toHaveBeenCalled()

      await act(async () => {
        settle('app_pin_no_device_authn')
      })
    })

    it('stops loading and saves nothing when registration fails, then succeeds on retry', async () => {
      jest.mocked(getAccountSecurityMethod).mockRejectedValueOnce(new Error('registration boom'))
      const { getByTestId } = renderScreen()
      const button = () => getByTestId(testIdWithKey(buttonId))

      fireEvent.press(button())

      await waitFor(() => {
        expect(getByTestId(testIdWithKey(TestIds.common.loadingOverlay), hidden).props.accessible).toBe(false)
      })
      expect(getByTestId('SetupTypeProbe', hidden).props.children).toBe('undefined')
      expect(mockNavigate).not.toHaveBeenCalled()
      expect(button().props.accessibilityState?.disabled ?? false).toBe(false)

      jest.mocked(getAccountSecurityMethod).mockResolvedValue('app_pin_no_device_authn' as any)
      jest.mocked(getAccount).mockResolvedValue({ clientID: 'client-id' } as any)

      fireEvent.press(button())

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(destination)
      })
      expect(getByTestId('SetupTypeProbe', hidden).props.children).toBe(setupType)
    })
  })
})
