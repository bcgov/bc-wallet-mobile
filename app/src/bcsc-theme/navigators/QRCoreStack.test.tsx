import * as Bifold from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { render } from '@testing-library/react-native'
import React from 'react'
import { useCardStatus } from '../hooks/useCardStatus'
import { BCSCQRCoreScreens, BCSCScreens } from '../types/navigators'
import QRCoreStack from './QRCoreStack'

let capturedNavigatorProps: any

jest.mock('@bifold/core')
jest.mock('@react-navigation/native')
jest.mock('@react-navigation/bottom-tabs', () => {
  const Navigator = (props: any) => {
    capturedNavigatorProps = props
    return null
  }
  Navigator.displayName = 'Navigator'
  const Screen = () => null
  Screen.displayName = 'Screen'
  return {
    createBottomTabNavigator: () => ({ Navigator, Screen }),
  }
})
jest.mock('../features/agent', () => ({
  AgentReadyGate: ({ children }: any) => children,
}))
jest.mock('../features/pairing/ManualPairing', () => 'ManualPairing')
jest.mock('../features/qr-core/QRDisplay', () => 'QRDisplay')
jest.mock('../features/qr-core/QRScanner', () => 'QRScanner')
jest.mock('../hooks/useCardStatus', () => ({
  useCardStatus: jest.fn(),
}))
jest.mock('@/constants', () => ({
  HelpCentreUrl: { COMPUTER_LOGIN: 'https://example.com' },
}))
jest.mock('../components/FloatingHelpMenuHeaderButton', () => ({
  createFloatingHelpMenuButton: jest.fn(() => () => null),
}))

const mockLogger = { debug: jest.fn() }

describe('QRCoreStack', () => {
  // The '@react-navigation/native' manual mock (__mocks__/@react-navigation/native.ts) returns
  // the same singleton navigation object from every useNavigation() call, with `getParent()`
  // returning an object that has no `goBack`. Point it at a fresh jest.fn() per test.
  let mockNavigation: ReturnType<typeof useNavigation> & { navigate: jest.Mock; getParent: jest.Mock }
  let mockGoBack: jest.Mock

  const getListeners = (routeName: string) => capturedNavigatorProps.screenListeners({ route: { name: routeName } })

  beforeEach(() => {
    jest.clearAllMocks()
    capturedNavigatorProps = undefined

    mockNavigation = useNavigation() as typeof mockNavigation
    mockGoBack = jest.fn()
    mockNavigation.getParent = jest.fn(() => ({ goBack: mockGoBack }))

    jest.mocked(Bifold.useTheme).mockReturnValue({
      TabTheme: {
        tabBarStyle: {},
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: '#fff',
        tabBarSecondaryBackgroundColor: '#fff',
        tabBarContainerStyle: {},
        tabBarTextStyle: { fontSize: 12 },
      },
      TextTheme: { bold: { fontFamily: 'bold' }, normal: { fontFamily: 'normal' } },
      Spacing: { lg: 24 },
    } as any)
    jest.mocked(Bifold.useServices).mockReturnValue([mockLogger] as any)
    jest.mocked(Bifold.testIdWithKey).mockImplementation((key: string) => key)

    jest.mocked(useCardStatus).mockReturnValue({ isActivelyVerified: true, isExpired: false } as any)
  })

  it('renders without crashing', () => {
    render(<QRCoreStack />)
    expect(capturedNavigatorProps).toBeDefined()
  })

  describe('focus listener', () => {
    it('does not redirect for non-PairingCode routes', () => {
      render(<QRCoreStack />)
      getListeners(BCSCQRCoreScreens.Scanner).focus()
      expect(mockNavigation.navigate).not.toHaveBeenCalled()
    })

    it('does not redirect for PairingCode when actively verified', () => {
      render(<QRCoreStack />)
      getListeners(BCSCQRCoreScreens.PairingCode).focus()
      expect(mockNavigation.navigate).not.toHaveBeenCalled()
    })

    it('redirects to MainVerifyPrompt for PairingCode when not actively verified and not expired', () => {
      jest.mocked(useCardStatus).mockReturnValue({ isActivelyVerified: false, isExpired: false } as any)
      render(<QRCoreStack />)

      getListeners(BCSCQRCoreScreens.PairingCode).focus()

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.MainVerifyPrompt)
    })

    it('redirects to ReverifyAccount for PairingCode when not actively verified and expired', () => {
      jest.mocked(useCardStatus).mockReturnValue({ isActivelyVerified: false, isExpired: true } as any)
      render(<QRCoreStack />)

      getListeners(BCSCQRCoreScreens.PairingCode).focus()

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.ReverifyAccount, { isExpired: true })
    })
  })

  describe('tabPress listener', () => {
    it('does not prevent the tab press for non-PairingCode routes', () => {
      render(<QRCoreStack />)
      const event = { preventDefault: jest.fn() }

      getListeners(BCSCQRCoreScreens.Display).tabPress(event)

      expect(event.preventDefault).not.toHaveBeenCalled()
      expect(mockNavigation.navigate).not.toHaveBeenCalled()
    })

    it('does not prevent the tab press for PairingCode when actively verified', () => {
      render(<QRCoreStack />)
      const event = { preventDefault: jest.fn() }

      getListeners(BCSCQRCoreScreens.PairingCode).tabPress(event)

      expect(event.preventDefault).not.toHaveBeenCalled()
      expect(mockNavigation.navigate).not.toHaveBeenCalled()
    })

    it('prevents the tab press and redirects to MainVerifyPrompt when not actively verified and not expired', () => {
      jest.mocked(useCardStatus).mockReturnValue({ isActivelyVerified: false, isExpired: false } as any)
      render(<QRCoreStack />)
      const event = { preventDefault: jest.fn() }

      getListeners(BCSCQRCoreScreens.PairingCode).tabPress(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.MainVerifyPrompt)
    })

    it('prevents the tab press and redirects to ReverifyAccount when not actively verified and expired', () => {
      jest.mocked(useCardStatus).mockReturnValue({ isActivelyVerified: false, isExpired: true } as any)
      render(<QRCoreStack />)
      const event = { preventDefault: jest.fn() }

      getListeners(BCSCQRCoreScreens.PairingCode).tabPress(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.ReverifyAccount, { isExpired: true })
    })
  })

  describe('QRBackButton', () => {
    it('navigates to the parent goBack when pressed', () => {
      render(<QRCoreStack />)

      // Invoke the function component directly to inspect the IconButton element it
      // returns, rather than rendering it — IconButton is automocked via @bifold/core.
      const BackButton = capturedNavigatorProps.screenOptions.headerLeft
      const element = BackButton({})
      element.props.onPress()

      expect(mockNavigation.getParent).toHaveBeenCalled()
      expect(mockGoBack).toHaveBeenCalled()
    })
  })
})
