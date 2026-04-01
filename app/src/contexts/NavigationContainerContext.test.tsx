import {
  NavigationContainerContext,
  NavigationContainerProvider,
  useNavigationContainer,
} from '@/contexts/NavigationContainerContext'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import { act, renderHook } from '@testing-library/react-native'
import { useContext } from 'react'

let capturedOnReady: (() => void) | undefined
let capturedOnStateChange: ((state: any) => void) | undefined

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children, onReady, onStateChange }: any) => {
    capturedOnReady = onReady
    capturedOnStateChange = onStateChange
    return <>{children}</>
  },
  createNavigationContainerRef: jest.fn(() => ({
    current: {
      getCurrentRoute: jest.fn(() => ({ name: undefined })),
    },
  })),
}))

jest.mock('@/bcsc-theme/navigators/stack-utils', () => ({
  getBaseScreenName: jest.fn((name: string) => name),
  getCurrentStateScreenName: jest.fn((state: any) => {
    const route = state?.routes?.[state.index]
    return route?.name
  }),
}))

jest.mock('@bifold/core', () => ({
  useTheme: jest.fn(() => ({
    NavigationTheme: {},
  })),
}))

jest.mock('@/utils/analytics/analytics-singleton', () => ({
  Analytics: {
    trackScreenEvent: jest.fn(),
  },
}))

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NavigationContainerProvider>{children}</NavigationContainerProvider>
)

describe('NavigationContainerContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    capturedOnReady = undefined
    capturedOnStateChange = undefined
  })

  it('should have isNavigationReady as false by default', () => {
    const { result } = renderHook(() => useContext(NavigationContainerContext), { wrapper })

    expect(result.current?.isNavigationReady).toBe(false)
  })

  it('should set isNavigationReady to true when onReady fires', () => {
    const { result } = renderHook(() => useContext(NavigationContainerContext), { wrapper })

    expect(result.current?.isNavigationReady).toBe(false)

    act(() => {
      capturedOnReady?.()
    })

    expect(result.current?.isNavigationReady).toBe(true)
  })

  describe('onStateChange', () => {
    it('should do nothing when state is null', () => {
      renderHook(() => useContext(NavigationContainerContext), { wrapper })

      capturedOnStateChange?.(null)

      expect(Analytics.trackScreenEvent).not.toHaveBeenCalled()
    })

    it('should track screen event when screen changes', () => {
      renderHook(() => useContext(NavigationContainerContext), { wrapper })

      capturedOnStateChange?.({
        index: 0,
        routes: [{ name: 'HomeScreen' }],
      })

      expect(Analytics.trackScreenEvent).toHaveBeenCalledWith('HomeScreen', undefined)
    })

    it('should not track duplicate consecutive transitions with same previous and current', () => {
      renderHook(() => useContext(NavigationContainerContext), { wrapper })

      const state = { index: 0, routes: [{ name: 'HomeScreen' }] }

      // First: undefined->HomeScreen (tracked)
      capturedOnStateChange?.(state)
      // Second: HomeScreen->HomeScreen (tracked, different transition key)
      capturedOnStateChange?.(state)
      // Third: HomeScreen->HomeScreen (NOT tracked, same transition key as previous)
      capturedOnStateChange?.(state)

      expect(Analytics.trackScreenEvent).toHaveBeenCalledTimes(2)
    })

    it('should track when navigating to a different screen', () => {
      renderHook(() => useContext(NavigationContainerContext), { wrapper })

      capturedOnStateChange?.({ index: 0, routes: [{ name: 'HomeScreen' }] })
      capturedOnStateChange?.({ index: 0, routes: [{ name: 'SettingsScreen' }] })

      expect(Analytics.trackScreenEvent).toHaveBeenCalledTimes(2)
      expect(Analytics.trackScreenEvent).toHaveBeenNthCalledWith(1, 'HomeScreen', undefined)
      expect(Analytics.trackScreenEvent).toHaveBeenNthCalledWith(2, 'SettingsScreen', 'HomeScreen')
    })
  })

  describe('useNavigationContainer', () => {
    it('should return context when used within provider', () => {
      const { result } = renderHook(() => useNavigationContainer(), { wrapper })

      expect(result.current.isNavigationReady).toBe(false)
    })

    it('should throw when used outside provider', () => {
      expect(() => {
        renderHook(() => useNavigationContainer())
      }).toThrow('useNavigationContainer must be used within a NavigationContainerProvider')
    })
  })
})
