import * as Bifold from '@bifold/core'
import { render } from '@testing-library/react-native'
import React from 'react'
import AuthStack from './AuthStack'

jest.mock('@bifold/core')
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
jest.mock('../contexts/BCSCStackContext', () => ({
  useBCSCStack: jest.fn(),
}))
jest.mock('../components/HeaderBackButton', () => ({
  createHeaderBackButton: jest.fn(() => 'HeaderBackButton'),
}))
jest.mock('../components/HeaderWithBanner', () => ({
  createHeaderWithoutBanner: jest.fn((props) => null),
}))
jest.mock('../components/SettingsHeaderButton', () => ({
  createAuthSettingsHeaderButton: jest.fn(() => () => 'SettingsHeaderButton'),
}))
jest.mock('../../screens/Developer', () => 'Developer')
jest.mock('../features/auth/AccountSelectorScreen', () => 'AccountSelector')
jest.mock('../features/auth/ConfirmDeviceAuthInfoScreen', () => ({
  ConfirmDeviceAuthInfoScreen: 'ConfirmDeviceAuthInfoScreen',
}))
jest.mock('../features/auth/DeviceAuthAppResetScreen', () => ({
  DeviceAuthAppResetScreen: 'DeviceAuthAppResetScreen',
}))
jest.mock('../features/auth/EnterPINScreen', () => ({
  EnterPINScreen: 'EnterPINScreen',
}))
jest.mock('../features/auth/LockoutScreen', () => ({
  LockoutScreen: 'LockoutScreen',
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
jest.mock('../features/settings/AuthPrivacyPolicyScreen', () => ({
  AuthPrivacyPolicyScreen: 'AuthPrivacyPolicyScreen',
}))
jest.mock('../features/settings/AuthSettingsScreen', () => ({
  AuthSettingsScreen: 'AuthSettingsScreen',
}))
jest.mock('../features/settings/ContactUsScreen', () => ({
  ContactUsScreen: 'ContactUsScreen',
}))
jest.mock('../features/webview/WebViewScreen', () => ({
  WebViewScreen: 'WebViewScreen',
}))

describe('AuthStack', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(Bifold.useDefaultStackOptions).mockReturnValue({} as any)
    jest.mocked(Bifold.useTheme).mockReturnValue({} as any)
  })

  it('renders correctly', () => {
    const { toJSON } = render(<AuthStack />)
    expect(toJSON()).toMatchSnapshot()
  })
})
