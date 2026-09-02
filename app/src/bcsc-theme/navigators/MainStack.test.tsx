import { SYSTEM_CHECK_LOADING_GATE_MAX_WAIT_MS } from '@/constants'
import * as Bifold from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { act, render } from '@testing-library/react-native'
import React from 'react'
import { useAccount } from '../contexts/BCSCAccountContext'
import * as PairingModule from '../features/pairing'
import { PairingNavigationListener, PairingPayload } from '../features/pairing/types'
import { useSystemChecks } from '../hooks/useSystemChecks'
import { BCSCScreens } from '../types/navigators'
import MainStack from './MainStack'

jest.mock('@/bcsc-theme/contexts/BCSCAccountContext')

let capturedNavigationListener: PairingNavigationListener | undefined

const mockUnsubscribe = jest.fn()
const mockOnNavigationRequest = jest.fn((listener: PairingNavigationListener) => {
  capturedNavigationListener = listener
  return mockUnsubscribe
})
const mockConsumePendingPairing = jest.fn((): PairingPayload | null => null)
const mockLogger = { error: jest.fn() }

const makePairingService = () => ({
  consumePendingPairing: mockConsumePendingPairing,
  onNavigationRequest: mockOnNavigationRequest,
})

jest.mock('@bifold/core')
jest.mock('@react-navigation/native')
jest.mock('@react-navigation/stack', () => {
  const Screen = ({ children }: any) => children
  Screen.displayName = 'Screen'
  const Navigator = ({ children }: any) => children
  Navigator.displayName = 'Navigator'
  return {
    createStackNavigator: () => ({
      Navigator,
      Screen,
    }),
  }
})
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock('@/constants', () => ({
  DEFAULT_HEADER_TITLE_CONTAINER_STYLE: {},
  HelpCentreUrl: { COMPUTER_LOGIN: 'https://example.com' },
  Mode: { BCWallet: 'bcwallet', BCSC: 'bcsc' },
  SYSTEM_CHECK_LOADING_GATE_MAX_WAIT_MS: 10000,
}))
jest.mock('../contexts/BCSCStackContext', () => ({
  useBCSCStack: jest.fn(),
}))
jest.mock('../contexts/BCSCLoadingContext', () => ({
  LoadingScreen: 'LoadingScreen',
}))
jest.mock('../hooks/useSystemChecks', () => ({
  SystemCheckScope: { MAIN_STACK: 'MAIN_STACK', ACCOUNT: 'ACCOUNT' },
  useSystemChecks: jest.fn(() => ({ hasSettled: true })),
}))
jest.mock('../features/pairing', () => ({
  usePairingService: jest.fn(),
  pairingPayloadToServiceLoginParams: jest.fn(),
}))
jest.mock('../features/connection-invitation', () => ({
  useConnectionInvitationDeepLink: jest.fn(),
}))
jest.mock('../features/verification-response/useVerificationResponseListener', () => ({
  useVerificationResponseListener: jest.fn(),
}))
jest.mock('../features/agent', () => ({
  AgentReadyGate: ({ children }: any) => children,
  BifoldScope: ({ children }: any) => children,
  withAgentReadyGate: (Component: any) => Component,
}))
jest.mock('../components/FloatingHelpMenuHeaderButton', () => ({
  createFloatingHelpMenuButton: jest.fn(() => () => null),
}))
jest.mock('../components/HeaderBackButton', () => ({
  createHeaderBackButton: jest.fn(() => null),
}))
jest.mock('../components/HeaderWithBanner', () => ({
  createHeaderWithoutBanner: jest.fn(() => null),
}))
jest.mock('./stack-utils', () => ({
  getDefaultModalOptions: jest.fn(() => ({})),
}))
jest.mock('./TabStack', () => 'BCSCTabStack')
jest.mock('../../screens/Developer', () => 'Developer')
jest.mock('../features/account-transfer/transferer/TransferQRDisplayScreen', () => 'TransferQRDisplayScreen')
jest.mock('../features/account-transfer/transferer/TransferQRInformationScreen', () => 'TransferQRInformationScreen')
jest.mock('../features/account-transfer/transferer/TransferSuccessScreen', () => 'TransferSuccessScreen')
jest.mock('../features/account/AccountRenewalFinalWarningScreen', () => ({
  AccountRenewalFinalWarningScreen: 'AccountRenewalFinalWarningScreen',
}))
jest.mock('../features/account/AccountRenewalFirstWarningScreen', () => ({
  AccountRenewalFirstWarningScreen: 'AccountRenewalFirstWarningScreen',
}))
jest.mock('../features/account/AccountRenewalInformationScreen', () => ({
  AccountRenewalInformationScreen: 'AccountRenewalInformationScreen',
}))
jest.mock('../features/account/EditNicknameScreen', () => 'EditNicknameScreen')
jest.mock('../features/account/RemoveAccountConfirmationScreen', () => ({
  MainRemoveAccountConfirmationScreen: 'MainRemoveAccountConfirmationScreen',
}))
jest.mock('../features/account/TransferAgeRestrictionScreen', () => 'TransferAgeRestrictionScreen')
jest.mock('../features/auth/MainChangePINScreen', () => ({ MainChangePINScreen: 'MainChangePINScreen' }))
jest.mock('../features/auth/MainChangeSecurityScreen', () => ({
  MainChangeSecurityScreen: 'MainChangeSecurityScreen',
}))
jest.mock('../features/modal/DeviceInvalidated', () => ({ DeviceInvalidated: 'DeviceInvalidated' }))
jest.mock('../features/modal/InternetDisconnected', () => ({ InternetDisconnected: 'InternetDisconnected' }))
jest.mock('../features/modal/MandatoryUpdate', () => ({ MandatoryUpdate: 'MandatoryUpdate' }))
jest.mock('../features/modal/ServiceOutage', () => ({ ServiceOutage: 'ServiceOutage' }))
jest.mock('../features/pairing/ManualPairing', () => 'ManualPairingCode')
jest.mock('../features/pairing/PairingConfirmation', () => 'PairingConfirmation')
jest.mock('../features/services/ServiceLoginScreen', () => ({ ServiceLoginScreen: 'ServiceLoginScreen' }))
jest.mock('../features/settings/AutoLockScreen', () => ({ AutoLockScreen: 'AutoLockScreen' }))
jest.mock('../features/settings/ForgetAllPairingsScreen', () => ({
  ForgetAllPairingsScreen: 'ForgetAllPairingsScreen',
}))
jest.mock('../features/settings/MainPrivacyPolicyScreen', () => ({
  MainPrivacyPolicyScreen: 'MainPrivacyPolicyScreen',
}))
jest.mock('../features/settings/MainSettingsScreen', () => ({ MainSettingsScreen: 'MainSettingsScreen' }))
jest.mock('../features/webview/WebViewScreen', () => ({ WebViewScreen: 'WebViewScreen' }))

describe('MainStack', () => {
  let mockNavigation: { dispatch: (...args: any[]) => void; navigate: (...args: any[]) => void }

  beforeEach(() => {
    capturedNavigationListener = undefined
    jest.clearAllMocks()
    mockNavigation = useNavigation() as typeof mockNavigation
    jest.mocked(Bifold.useDefaultStackOptions).mockReturnValue({} as any)
    jest.mocked(Bifold.useTheme).mockReturnValue({} as any)
    jest.mocked(Bifold.useTour).mockReturnValue({ currentStep: undefined } as any)
    jest.mocked(Bifold.useServices).mockReturnValue([mockLogger] as any)
    jest.mocked(Bifold.useStore).mockReturnValue([{ bcsc: { bannerMessages: [] } }, jest.fn()] as any)
    jest.mocked(Bifold.testIdWithKey).mockImplementation((key: string) => key)
    jest.mocked(PairingModule.usePairingService).mockReturnValue(makePairingService() as any)
    jest.mocked(PairingModule.pairingPayloadToServiceLoginParams).mockReturnValue({ pairingCode: 'code' } as any)
    jest.mocked(useSystemChecks).mockReturnValue({ hasSettled: true })
  })

  const queryLoadingScreens = (view: ReturnType<typeof render>) => view.UNSAFE_queryAllByType('LoadingScreen' as any)

  it('renders correctly', () => {
    const { toJSON } = render(<MainStack />)
    expect(toJSON()).toMatchSnapshot()
  })

  it('navigates to ServiceLogin when pairing service emits a navigation request', () => {
    render(<MainStack />)

    const params = { serviceTitle: 'My Service', pairingCode: 'abc123' }
    capturedNavigationListener!({ screen: BCSCScreens.ServiceLogin, params })

    expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.ServiceLogin, params)
  })

  it('does not navigate when pairing service emits a non-ServiceLogin screen', () => {
    render(<MainStack />)
    capturedNavigationListener!({ screen: 'SomeOtherScreen' as any, params: {} as any })

    expect(mockNavigation.navigate).not.toHaveBeenCalled()
  })

  it('unsubscribes from pairing navigation requests on unmount', () => {
    const { unmount } = render(<MainStack />)
    unmount()

    expect(mockUnsubscribe).toHaveBeenCalled()
  })

  it('calls pairingPayloadToServiceLoginParams when there is a valid pending pairing', () => {
    const payload: PairingPayload = { serviceTitle: 'My Service', pairingCode: 'abc123', source: 'manual' }
    mockConsumePendingPairing.mockReturnValue(payload)

    render(<MainStack />)

    expect(PairingModule.pairingPayloadToServiceLoginParams).toHaveBeenCalledWith(payload)
  })

  it('calls pairingPayloadToServiceLoginParams for a deep-link pending pairing (cold start)', () => {
    const payload: PairingPayload = { serviceTitle: 'My Service', pairingCode: 'abc123', source: 'deep-link' }
    mockConsumePendingPairing.mockReturnValue(payload)

    render(<MainStack />)

    expect(PairingModule.pairingPayloadToServiceLoginParams).toHaveBeenCalledWith(payload)
  })

  it('logs an error and skips pairingPayloadToServiceLoginParams when pending pairing is missing fields', () => {
    mockConsumePendingPairing.mockReturnValue({ serviceTitle: null, pairingCode: null } as unknown as PairingPayload)

    render(<MainStack />)

    expect(mockLogger.error).toHaveBeenCalled()
    expect(PairingModule.pairingPayloadToServiceLoginParams).not.toHaveBeenCalled()
  })

  it('does not call pairingPayloadToServiceLoginParams when there is no pending pairing', () => {
    mockConsumePendingPairing.mockReturnValue(null)

    render(<MainStack />)

    expect(PairingModule.pairingPayloadToServiceLoginParams).not.toHaveBeenCalled()
  })

  it('shows the loading screen while the account is still loading', () => {
    jest.mocked(useAccount).mockReturnValueOnce({ isLoadingAccount: true } as any)

    const { toJSON } = render(<MainStack />)

    expect(toJSON()).toMatchObject({ type: 'LoadingScreen' })
  })

  it('holds the loading screen over the stack while system checks are still settling', () => {
    jest.mocked(useSystemChecks).mockReturnValue({ hasSettled: false })

    expect(queryLoadingScreens(render(<MainStack />))).toHaveLength(1)
  })

  it('drops the loading screen once the system checks have settled', () => {
    expect(queryLoadingScreens(render(<MainStack />))).toHaveLength(0)
  })

  it('releases the loading screen when the system checks never settle', () => {
    jest.useFakeTimers()
    jest.mocked(useSystemChecks).mockReturnValue({ hasSettled: false })

    try {
      const view = render(<MainStack />)
      expect(queryLoadingScreens(view)).toHaveLength(1)

      act(() => {
        jest.advanceTimersByTime(SYSTEM_CHECK_LOADING_GATE_MAX_WAIT_MS)
      })

      expect(queryLoadingScreens(view)).toHaveLength(0)
    } finally {
      jest.useRealTimers()
    }
  })
})
