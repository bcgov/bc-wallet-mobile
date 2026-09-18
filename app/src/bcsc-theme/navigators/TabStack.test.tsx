import * as Bifold from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { act, render } from '@testing-library/react-native'
import React from 'react'

import { FloatingScanButton } from '../features/scan'
import { useCardStatus } from '../hooks/useCardStatus'
import { BCSCModals, BCSCScreens, BCSCStacks } from '../types/navigators'
import BCSCTabStack from './TabStack'

const mockUseServerStatus = jest.fn()
jest.mock('@/bcsc-theme/contexts/ServerStatusContext', () => ({
  useServerStatus: () => mockUseServerStatus(),
}))

let capturedNavigatorProps: any
let mockTabBarState: { index: number; routes: { key: string; name: string }[] }

jest.mock('@bifold/core')
jest.mock('@react-navigation/native')
jest.mock('@react-navigation/bottom-tabs', () => {
  const Navigator = (props: any) => {
    capturedNavigatorProps = props
    // The real navigator renders the custom tab bar and feeds it the navigator's own state; do the
    // same here, since that state is what tells the FAB which tab is focused.
    return props.tabBar({ state: mockTabBarState, descriptors: {}, navigation: {}, insets: {} })
  }
  Navigator.displayName = 'Navigator'
  const Screen = () => null
  Screen.displayName = 'Screen'
  const BottomTabBar = () => null
  BottomTabBar.displayName = 'BottomTabBar'
  return {
    createBottomTabNavigator: () => ({ Navigator, Screen }),
    BottomTabBar,
  }
})
jest.mock('../features/home/Home', () => 'Home')
jest.mock('../features/services/Services', () => 'Services')
jest.mock('../features/agent', () => ({
  AgentReadyGate: 'AgentReadyGate',
  CredentialsReadyGate: 'CredentialsReadyGate',
}))
jest.mock('../features/scan', () => ({
  FloatingScanButton: jest.fn(() => null),
}))
jest.mock('../components/FloatingHelpMenuHeaderButton', () => ({
  createFloatingHelpMenuButton: jest.fn(() => () => null),
}))
jest.mock('../components/HeaderWithBanner', () => ({
  createTabHeaderWithoutBanner: jest.fn(() => null),
}))
jest.mock('../components/SettingsHeaderButton', () => ({
  createMainSettingsHeaderButton: jest.fn(() => () => null),
}))
jest.mock('../hooks/useCardStatus', () => ({
  useCardStatus: jest.fn(),
}))
jest.mock('@/hooks/notifications', () => ({
  useNotifications: jest.fn(() => []),
}))
jest.mock('@/hooks/useCustomNotifications', () => ({
  useCustomNotifications: jest.fn(() => ({ customNotifications: [] })),
}))
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'CommunityIcon')
jest.mock('react-native-vector-icons/MaterialIcons', () => ({
  hasIcon: () => true,
}))

const mockLogger = { debug: jest.fn() }

const TAB_ROUTES = [
  { key: 'home', name: BCSCScreens.Home },
  { key: 'services', name: BCSCScreens.Services },
  { key: 'wallet', name: BCSCScreens.Wallet },
]

/** Navigator state with `focusedIndex` as the focused tab. */
const tabState = (focusedIndex: number) => ({ index: focusedIndex, routes: TAB_ROUTES })

describe('BCSCTabStack', () => {
  let mockNavigation: ReturnType<typeof useNavigation> & { navigate: jest.Mock }

  const getListeners = (routeName: string) => capturedNavigatorProps.screenListeners({ route: { name: routeName } })

  /** The tab the FAB was last told about — it renders only for Home and Wallet. */
  const activeTabNameSeenByFab = () => jest.mocked(FloatingScanButton).mock.calls.at(-1)?.[0].activeTabName

  beforeEach(() => {
    jest.clearAllMocks()
    capturedNavigatorProps = undefined
    mockTabBarState = tabState(0)

    mockNavigation = useNavigation() as typeof mockNavigation

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
      ColorPalette: {
        brand: { highlight: '#123456' },
        notification: { errorIcon: '#f00' },
      },
      Spacing: { md: 16, lg: 24 },
    } as any)
    jest.mocked(Bifold.useServices).mockReturnValue([mockLogger] as any)
    jest.mocked(Bifold.testIdWithKey).mockImplementation((key: string) => key)

    jest.mocked(useCardStatus).mockReturnValue({ isActivelyVerified: true, isExpired: false } as any)
    mockUseServerStatus.mockReturnValue({ isAvailable: true })
  })

  it('renders without crashing', () => {
    render(<BCSCTabStack />)
    expect(capturedNavigatorProps).toBeDefined()
  })

  describe('unverified Services gating', () => {
    beforeEach(() => {
      jest.mocked(useCardStatus).mockReturnValue({ isActivelyVerified: false, isExpired: false } as any)
    })

    it('prevents the tab press and redirects to the verify prompt', () => {
      render(<BCSCTabStack />)
      const event = { preventDefault: jest.fn() }

      act(() => getListeners(BCSCScreens.Services).tabPress(event))

      expect(event.preventDefault).toHaveBeenCalled()
      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.MainVerifyPrompt)
    })

    it('redirects to ReverifyAccount when the card is expired', () => {
      jest.mocked(useCardStatus).mockReturnValue({ isActivelyVerified: false, isExpired: true } as any)
      render(<BCSCTabStack />)
      const event = { preventDefault: jest.fn() }

      act(() => getListeners(BCSCScreens.Services).tabPress(event))

      expect(event.preventDefault).toHaveBeenCalled()
      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.ReverifyAccount, { isExpired: true })
    })

    it('keeps the scan FAB on Home after a prevented Services press', () => {
      const { rerender } = render(<BCSCTabStack />)
      expect(activeTabNameSeenByFab()).toBe(BCSCScreens.Home)

      act(() => getListeners(BCSCScreens.Services).tabPress({ preventDefault: jest.fn() }))

      // The press was prevented, so the navigator never left Home. Returning from the verify prompt
      // must land on a Home tab that still shows the FAB.
      rerender(<BCSCTabStack />)
      expect(activeTabNameSeenByFab()).toBe(BCSCScreens.Home)
    })

    // Regression: without switching the tab back to Home first, Services stays the focused tab
    // underneath the verify prompt. Backing out of it would refocus Services, which fires this
    // listener again and redirects right back - trapping the user in a loop.
    it('switches the tab navigator back to Home before pushing the verify prompt', () => {
      render(<BCSCTabStack />)

      act(() => getListeners(BCSCScreens.Services).focus())

      const calls = mockNavigation.navigate.mock.calls
      const resetCallIndex = calls.findIndex(
        ([name, params]) => name === BCSCStacks.Tab && (params as any)?.screen === BCSCScreens.Home
      )
      const destinationCallIndex = calls.findIndex(([name]) => name === BCSCScreens.MainVerifyPrompt)

      expect(resetCallIndex).toBeGreaterThanOrEqual(0)
      expect(destinationCallIndex).toBeGreaterThan(resetCallIndex)
    })
  })

  describe('server outage gating', () => {
    beforeEach(() => {
      mockUseServerStatus.mockReturnValue({ isAvailable: false })
    })

    it('prevents the tab press and redirects to the outage screen', () => {
      render(<BCSCTabStack />)
      const event = { preventDefault: jest.fn() }

      act(() => getListeners(BCSCScreens.Services).tabPress(event))

      expect(event.preventDefault).toHaveBeenCalled()
      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCModals.ServiceOutage, {})
    })

    it('redirects on Services focus, not just tab press', () => {
      render(<BCSCTabStack />)

      act(() => getListeners(BCSCScreens.Services).focus())

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCModals.ServiceOutage, {})
    })

    it('redirects to the outage screen even for an unverified account', () => {
      // An outage explains why Services can't render regardless of verification status,
      // so it should win over the verify-prompt/reverify redirects.
      jest.mocked(useCardStatus).mockReturnValue({ isActivelyVerified: false, isExpired: true } as any)
      render(<BCSCTabStack />)
      const event = { preventDefault: jest.fn() }

      act(() => getListeners(BCSCScreens.Services).tabPress(event))

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCModals.ServiceOutage, {})
      expect(mockNavigation.navigate).not.toHaveBeenCalledWith(BCSCScreens.ReverifyAccount, expect.anything())
    })

    // Regression: without switching the tab back to Home first, Services stays the focused tab
    // underneath the outage screen. Backing out of it would refocus Services, which fires this
    // listener again and redirects right back - trapping the user in a loop.
    it('switches the tab navigator back to Home before pushing the outage screen', () => {
      render(<BCSCTabStack />)

      act(() => getListeners(BCSCScreens.Services).focus())

      const calls = mockNavigation.navigate.mock.calls
      const resetCallIndex = calls.findIndex(
        ([name, params]) => name === BCSCStacks.Tab && (params as any)?.screen === BCSCScreens.Home
      )
      const destinationCallIndex = calls.findIndex(([name]) => name === BCSCModals.ServiceOutage)

      expect(resetCallIndex).toBeGreaterThanOrEqual(0)
      expect(destinationCallIndex).toBeGreaterThan(resetCallIndex)
    })
  })

  describe('active tab tracking', () => {
    it('follows the focused tab reported by the navigator', () => {
      const { rerender } = render(<BCSCTabStack />)
      expect(activeTabNameSeenByFab()).toBe(BCSCScreens.Home)

      mockTabBarState = tabState(1)
      rerender(<BCSCTabStack />)
      expect(activeTabNameSeenByFab()).toBe(BCSCScreens.Services)

      mockTabBarState = tabState(2)
      rerender(<BCSCTabStack />)
      expect(activeTabNameSeenByFab()).toBe(BCSCScreens.Wallet)
    })

    it('follows a tab change that happens without a tab press, such as back navigation', () => {
      mockTabBarState = tabState(1)
      const { rerender } = render(<BCSCTabStack />)
      expect(activeTabNameSeenByFab()).toBe(BCSCScreens.Services)

      // Hardware back moves focus to Home with no tabPress event of any kind.
      mockTabBarState = tabState(0)
      rerender(<BCSCTabStack />)
      expect(activeTabNameSeenByFab()).toBe(BCSCScreens.Home)
    })
  })

  describe('verified navigation', () => {
    it('does not prevent the Services tab press', () => {
      render(<BCSCTabStack />)
      const event = { preventDefault: jest.fn() }

      act(() => getListeners(BCSCScreens.Services).tabPress(event))

      expect(event.preventDefault).not.toHaveBeenCalled()
      expect(mockNavigation.navigate).not.toHaveBeenCalled()
    })

    it('does not redirect on Services focus', () => {
      render(<BCSCTabStack />)

      act(() => getListeners(BCSCScreens.Services).focus())

      expect(mockNavigation.navigate).not.toHaveBeenCalled()
    })
  })
})
