import * as Bifold from '@bifold/core'
import { render } from '@testing-library/react-native'
import React from 'react'
import { BCSCModals, BCSCScreens } from '../types/navigators'
import AuthStack from './AuthStack'

let capturedNavigatorProps: any

jest.mock('@bifold/core')
jest.mock('@react-navigation/stack', () => {
  const Screen = () => null
  Screen.displayName = 'Screen'
  const Navigator = (props: any) => {
    capturedNavigatorProps = props
    return null
  }
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
  createHeaderWithoutBanner: jest.fn(() => null),
}))
jest.mock('../components/SettingsHeaderButton', () => ({
  createAuthSettingsHeaderButton: jest.fn(() => () => 'SettingsHeaderButton'),
}))
jest.mock('../../screens/Developer', () => 'Developer')
jest.mock('../features/auth/AccountLandingScreen', () => 'AccountLanding')
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
jest.mock('../features/webview/WebViewScreen', () => ({
  WebViewScreen: 'WebViewScreen',
}))

const renderStack = (storeOverrides: Record<string, unknown> = {}) => {
  jest.mocked(Bifold.useStore).mockReturnValue([{ bcsc: { ...storeOverrides } }, jest.fn()] as any)
  render(<AuthStack />)
  return capturedNavigatorProps
}

const registeredScreens = (): { name: string; options: any }[] =>
  React.Children.toArray(capturedNavigatorProps.children).map((child: any) => child.props)

const optionsFor = (name: string) => registeredScreens().find((screen) => screen.name === name)?.options

describe('AuthStack', () => {
  beforeEach(() => {
    capturedNavigatorProps = undefined
    jest.mocked(Bifold.useDefaultStackOptions).mockReturnValue({} as any)
    jest.mocked(Bifold.useTheme).mockReturnValue({} as any)
  })

  it('registers every auth screen and modal', () => {
    renderStack()

    expect(registeredScreens().map((screen) => screen.name)).toEqual([
      BCSCScreens.AuthIntro,
      BCSCScreens.AccountLanding,
      BCSCScreens.EnterPIN,
      BCSCScreens.DeviceAuthInfo,
      BCSCScreens.Lockout,
      BCSCScreens.DeviceAuthAppReset,
      BCSCScreens.AuthSettings,
      BCSCScreens.AuthWebView,
      BCSCScreens.AuthPrivacyPolicy,
      BCSCScreens.AuthDeveloper,
      BCSCScreens.PairingConfirmation,
      BCSCScreens.EditNickname,
      BCSCModals.InternetDisconnected,
      BCSCModals.MandatoryUpdate,
      BCSCModals.ServiceOutage,
    ])
  })

  it('opens on the intro screen until the user has seen it', () => {
    renderStack({ hasSeenOnboardingIntro: false })

    expect(capturedNavigatorProps.initialRouteName).toBe(BCSCScreens.AuthIntro)
  })

  it('opens on the account landing screen once the intro has been seen', () => {
    renderStack({ hasSeenOnboardingIntro: true })

    expect(capturedNavigatorProps.initialRouteName).toBe(BCSCScreens.AccountLanding)
  })

  it('wires the shared header into every screen', () => {
    renderStack()

    expect(capturedNavigatorProps.screenOptions).toEqual(
      expect.objectContaining({
        headerShadowVisible: false,
        headerLeft: expect.any(Function),
        header: expect.any(Function),
        headerRight: expect.anything(),
      })
    )
  })

  it.each([BCSCScreens.AuthIntro, BCSCScreens.Lockout])('offers no back destination from %s', (screen) => {
    renderStack()

    expect(optionsFor(screen).headerLeft()).toBeNull()
  })

  it.each([BCSCModals.InternetDisconnected, BCSCModals.MandatoryUpdate, BCSCModals.ServiceOutage])(
    'presents %s as a non-dismissable modal',
    (modal) => {
      renderStack()

      expect(optionsFor(modal)).toEqual(expect.objectContaining({ presentation: 'modal', gestureEnabled: false }))
    }
  )
})
