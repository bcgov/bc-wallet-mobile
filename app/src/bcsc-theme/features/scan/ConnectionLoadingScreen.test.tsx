import { BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import { CommonActions } from '@react-navigation/native'
import { render } from '@testing-library/react-native'
import React from 'react'
import Toast from 'react-native-toast-message'

import ConnectionLoadingScreen from './ConnectionLoadingScreen'
import useConnectionLoadingViewModel from './useConnectionLoadingViewModel'

jest.mock('react-native-toast-message', () => ({ show: jest.fn() }))
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }))
jest.mock('./useConnectionLoadingViewModel', () => ({ __esModule: true, default: jest.fn() }))
jest.mock('@bifold/core', () => ({
  CredentialOffer: () => null,
  ProofRequest: () => null,
  LoadingPlaceholder: () => null,
  LoadingPlaceholderWorkflowType: { Connection: 'Connection' },
  testIdWithKey: (k: string) => `id/${k}`,
  ToastType: { Success: 'success' },
}))

const useViewModel = useConnectionLoadingViewModel as jest.MockedFunction<typeof useConnectionLoadingViewModel>

const mkProps = () => {
  const navigation = { dispatch: jest.fn(), navigate: jest.fn(), getParent: jest.fn() } as any
  const route = { params: { oobRecordId: 'oob-1' } } as any
  return { navigation, route }
}

describe('ConnectionLoadingScreen', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders LoadingPlaceholder when state is loading', () => {
    useViewModel.mockReturnValue({ kind: 'loading' })
    const { navigation, route } = mkProps()
    render(<ConnectionLoadingScreen navigation={navigation} route={route} />)
    expect(navigation.dispatch).not.toHaveBeenCalled()
    expect(Toast.show).not.toHaveBeenCalled()
  })

  it('resets to BCSC Home and toasts on connection-only state', () => {
    useViewModel.mockReturnValue({ kind: 'connection' })
    const { navigation, route } = mkProps()
    render(<ConnectionLoadingScreen navigation={navigation} route={route} />)
    expect(navigation.dispatch).toHaveBeenCalledWith(
      CommonActions.reset({
        index: 0,
        routes: [{ name: BCSCStacks.Tab, state: { routes: [{ name: BCSCScreens.Home }] } }],
      })
    )
    expect(Toast.show).toHaveBeenCalledWith({ type: 'success', text1: 'Connection.ConnectionCompleted' })
  })

  it('renders ProofRequest when state is proof', () => {
    useViewModel.mockReturnValue({ kind: 'proof', proofId: 'p-1' })
    const { navigation, route } = mkProps()
    expect(() => render(<ConnectionLoadingScreen navigation={navigation} route={route} />)).not.toThrow()
    expect(navigation.dispatch).not.toHaveBeenCalled()
  })

  it('renders CredentialOffer when state is credentialOffer', () => {
    useViewModel.mockReturnValue({ kind: 'credentialOffer', credentialId: 'c-1' })
    const { navigation, route } = mkProps()
    expect(() => render(<ConnectionLoadingScreen navigation={navigation} route={route} />)).not.toThrow()
    expect(navigation.dispatch).not.toHaveBeenCalled()
  })
})
