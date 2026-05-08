import * as Bifold from '@bifold/core'
import { render } from '@testing-library/react-native'
import React from 'react'
import { BCSCScreens } from '../types/navigators'
import MainStack from './MainStack'

jest.mock('@bifold/core')
jest.mock('@react-navigation/native')
jest.mock('@/constants', () => ({
  DEFAULT_HEADER_TITLE_CONTAINER_STYLE: {},
  HelpCentreUrl: { COMPUTER_LOGIN: 'https://help.example.com' },
}))
jest.mock('@react-navigation/stack', () => {
  const Screen = ({ children }: any) => children || null
  Screen.displayName = 'Screen'
  const Navigator = ({ children }: any) => children
  Navigator.displayName = 'Navigator'
  return {
    createStackNavigator: () => ({ Navigator, Screen }),
  }
})
jest.mock('../contexts/BCSCAccountContext', () => ({
  useAccount: jest.fn(),
}))
jest.mock('../contexts/BCSCStackContext', () => ({
  useBCSCStack: jest.fn(),
}))
jest.mock('../features/pairing', () => ({
  usePairingService: jest.fn(),
}))
jest.mock('../hooks/useSystemChecks', () => ({
  SystemCheckScope: { MAIN_STACK: 'MAIN_STACK' },
  useSystemChecks: jest.fn(),
}))
jest.mock('@/services/system-checks/AccountExpiryWarningBannerSystemCheck', () => ({
  isAccountExpired: jest.fn(),
}))
jest.mock('../components/HeaderBackButton', () => ({
  createHeaderBackButton: jest.fn(() => 'HeaderBackButton'),
}))
jest.mock('../components/HeaderWithBanner', () => ({
  createHeaderWithoutBanner: jest.fn(() => null),
}))
jest.mock('../components/HelpHeaderButton', () => ({
  createMainHelpHeaderButton: jest.fn(() => () => 'HelpHeaderButton'),
}))
jest.mock('./stack-utils', () => ({
  getDefaultModalOptions: jest.fn(() => ({})),
}))
jest.mock('./TabStack', () => 'TabStack')
jest.mock('../../screens/Developer', () => 'Developer')
jest.mock('../features/account-transfer/transferer/TransferQRDisplayScreen', () => 'TransferQRDisplayScreen')
jest.mock('../features/account-transfer/transferer/TransferQRInformationScreen', () => 'TransferQRInformationScreen')
jest.mock('../features/account-transfer/transferer/TransferSuccessScreen', () => 'TransferSuccessScreen')
jest.mock('../features/account/AccountExpiredScreen', () => ({
  AccountExpiredScreen: 'AccountExpiredScreen',
}))
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
jest.mock('../features/auth/MainChangePINScreen', () => ({
  MainChangePINScreen: 'MainChangePINScreen',
}))
jest.mock('../features/auth/MainChangeSecurityScreen', () => ({
  MainChangeSecurityScreen: 'MainChangeSecurityScreen',
}))
jest.mock('../features/modal/DeviceInvalidated', () => ({
  DeviceInvalidated: 'DeviceInvalidated',
}))
jest.mock('../features/modal/InternetDisconnected', () => ({
  InternetDisconnected: 'InternetDisconnected',
}))
jest.mock('../features/modal/MandatoryUpdate', () => ({
  MandatoryUpdate: 'MandatoryUpdate',
}))
jest.mock('../features/modal/ServiceOutage', () => ({
  ServiceOutage: 'ServiceOutage',
}))
jest.mock('../features/pairing/ManualPairing', () => 'ManualPairingCode')
jest.mock('../features/pairing/PairingConfirmation', () => 'PairingConfirmation')
jest.mock('../features/services/ServiceLoginScreen', () => ({
  ServiceLoginScreen: 'ServiceLoginScreen',
}))
jest.mock('../features/settings/AutoLockScreen', () => ({
  AutoLockScreen: 'AutoLockScreen',
}))
jest.mock('../features/settings/ContactUsScreen', () => ({
  ContactUsScreen: 'ContactUsScreen',
}))
jest.mock('../features/settings/ForgetAllPairingsScreen', () => ({
  ForgetAllPairingsScreen: 'ForgetAllPairingsScreen',
}))
jest.mock('../features/settings/MainPrivacyPolicyScreen', () => ({
  MainPrivacyPolicyScreen: 'MainPrivacyPolicyScreen',
}))
jest.mock('../features/settings/MainSettingsScreen', () => ({
  MainSettingsScreen: 'MainSettingsScreen',
}))
jest.mock('../features/webview/WebViewScreen', () => ({
  WebViewScreen: 'WebViewScreen',
}))

const { CommonActions, useNavigation } = jest.requireMock('@react-navigation/native')
const { navigate, dispatch } = useNavigation()

describe('MainStack', () => {
  const mockOnNavigationRequest = jest.fn()
  const mockConsumedPairing = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(Bifold.useDefaultStackOptions).mockReturnValue({} as any)
    jest.mocked(Bifold.useTheme).mockReturnValue({} as any)
    jest.mocked(Bifold.useTour).mockReturnValue({ currentStep: undefined } as any)
    jest.mocked(Bifold.useServices).mockReturnValue([undefined] as any)
    jest.mocked(Bifold.testIdWithKey).mockImplementation((key) => key)

    const { useAccount } = require('../contexts/BCSCAccountContext')
    useAccount.mockReturnValue({ account: null })

    const { usePairingService } = require('../features/pairing')
    usePairingService.mockReturnValue({
      consumePendingPairing: mockConsumedPairing.mockReturnValue(null),
      onNavigationRequest: mockOnNavigationRequest.mockReturnValue(jest.fn()),
    })

    const { isAccountExpired } = require('@/services/system-checks/AccountExpiryWarningBannerSystemCheck')
    jest.mocked(isAccountExpired).mockReturnValue(false)
  })

  it('renders correctly', () => {
    const { toJSON } = render(<MainStack />)
    expect(toJSON()).toMatchSnapshot()
  })

  it('dispatches a reset to AccountExpired when account is expired', () => {
    const { useAccount } = require('../contexts/BCSCAccountContext')
    useAccount.mockReturnValue({ account: { account_expiration_date: '2020-01-01' } })

    const { isAccountExpired } = require('@/services/system-checks/AccountExpiryWarningBannerSystemCheck')
    jest.mocked(isAccountExpired).mockReturnValue(true)

    render(<MainStack />)

    expect(CommonActions.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: BCSCScreens.AccountExpired }],
    })
    expect(dispatch).toHaveBeenCalled()
  })

  it('does not dispatch a reset when account is not expired', () => {
    const { useAccount } = require('../contexts/BCSCAccountContext')
    useAccount.mockReturnValue({ account: { account_expiration_date: '2099-01-01' } })

    render(<MainStack />)

    expect(dispatch).not.toHaveBeenCalled()
  })

  it('navigates to ServiceLogin when the pairing service fires a navigation request', () => {
    let capturedListener: ((event: any) => void) | undefined
    mockOnNavigationRequest.mockImplementation((listener: (event: any) => void) => {
      capturedListener = listener
      return jest.fn()
    })

    render(<MainStack />)

    capturedListener!({
      screen: BCSCScreens.ServiceLogin,
      params: { serviceTitle: 'Test Service', pairingCode: 'abc123' },
    })

    expect(navigate).toHaveBeenCalledWith(BCSCScreens.ServiceLogin, {
      serviceTitle: 'Test Service',
      pairingCode: 'abc123',
    })
  })

  it('does not navigate when the pairing service fires a request for an unknown screen', () => {
    let capturedListener: ((event: any) => void) | undefined
    mockOnNavigationRequest.mockImplementation((listener: (event: any) => void) => {
      capturedListener = listener
      return jest.fn()
    })

    render(<MainStack />)

    capturedListener!({ screen: 'SomeOtherScreen', params: {} })

    expect(navigate).not.toHaveBeenCalled()
  })
})
