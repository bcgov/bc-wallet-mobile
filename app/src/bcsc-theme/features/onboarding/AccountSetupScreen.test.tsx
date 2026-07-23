import { BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { AccountSetupType, BCState, initialState } from '@/store'
import { useStore } from '@bifold/core'
import { useNavigation as getMockNavigation, useFocusEffect } from '@mocks/@react-navigation/native'
import { BasicAppContext } from '@mocks/helpers/app'
import { render, waitFor } from '@testing-library/react-native'
import React, { useEffect } from 'react'
import { Text } from 'react-native'
import { getAuthorizationRequest, setAuthorizationRequest } from 'react-native-bcsc-core'
import AccountSetupScreen from './AccountSetupScreen'

/** Exposes the current account setup type in the tree so tests can observe store updates. */
const SetupTypeProbe = () => {
  const [store] = useStore<BCState>()
  return <Text testID="SetupTypeProbe">{String(store.bcsc.accountSetupType)}</Text>
}

const mockNavigation = getMockNavigation() as never

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
})
