import {
  MAX_VISITED_SCREENS,
  NAVIGATION_TRAIL,
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
  // Only matches the real helper for flat stacks; nested behaviour is covered in the .nested test
  getRouteNamesBelowFocus: jest.fn((state: any) => state.routes.slice(0, state.index).map((r: any) => r.name)),
  isForwardPush: jest.fn((previous: any, next: any) => {
    const beneath = next.routes[next.index - 1]

    return beneath?.key !== undefined && beneath.key === previous.routes[previous.index].key
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
    NAVIGATION_TRAIL.screens.length = 0
    NAVIGATION_TRAIL.droppedCount = 0
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

    it('should append each newly visited screen to the navigation trail', () => {
      renderHook(() => useContext(NavigationContainerContext), { wrapper })

      capturedOnStateChange?.({ index: 0, routes: [{ name: 'HomeScreen' }] })
      capturedOnStateChange?.({ index: 0, routes: [{ name: 'SettingsScreen' }] })

      expect(NAVIGATION_TRAIL.screens).toEqual([
        { name: 'HomeScreen', isBack: false },
        { name: 'SettingsScreen', isBack: false },
      ])
    })

    it('should not append to the navigation trail for a duplicate consecutive transition', () => {
      renderHook(() => useContext(NavigationContainerContext), { wrapper })

      const state = { index: 0, routes: [{ name: 'HomeScreen' }] }

      // Unlike the Analytics dedup above (which keys on previous->current and so still fires on the
      // second call), the breadcrumb trail compares directly against the last recorded entry, so
      // repeated onStateChange calls for the same screen never add more than one entry.
      capturedOnStateChange?.(state)
      capturedOnStateChange?.(state)
      capturedOnStateChange?.(state)

      expect(NAVIGATION_TRAIL.screens).toEqual([{ name: 'HomeScreen', isBack: false }])
    })

    it('should keep the entry point and count dropped entries once MAX_VISITED_SCREENS is exceeded', () => {
      renderHook(() => useContext(NavigationContainerContext), { wrapper })

      const totalScreens = MAX_VISITED_SCREENS + 5

      for (let i = 0; i < totalScreens; i++) {
        capturedOnStateChange?.({ index: 0, routes: [{ name: `Screen${i}` }] })
      }

      const { screens, droppedCount } = NAVIGATION_TRAIL

      expect(screens).toHaveLength(MAX_VISITED_SCREENS)
      expect(screens[0].name).toBe('Screen0')
      expect(screens[1].name).toBe(`Screen${totalScreens - MAX_VISITED_SCREENS + 1}`)
      expect(screens[screens.length - 1].name).toBe(`Screen${totalScreens - 1}`)
      expect(droppedCount).toBe(5)
    })

    describe('back navigation', () => {
      const stack = (names: string[]) => ({
        index: names.length - 1,
        routes: names.map((name) => ({ name, key: name })),
      })
      const isBackFlags = () => NAVIGATION_TRAIL.screens.map((screen) => screen.isBack)

      beforeEach(() => {
        renderHook(() => useContext(NavigationContainerContext), { wrapper })
      })

      it('records the first state as a fresh arrival', () => {
        capturedOnStateChange?.(stack(['Home']))

        expect(isBackFlags()).toEqual([false])
      })

      it('marks returning with the back button as back', () => {
        capturedOnStateChange?.(stack(['Home']))
        capturedOnStateChange?.(stack(['Home', 'Settings']))
        capturedOnStateChange?.(stack(['Home']))

        expect(NAVIGATION_TRAIL.screens).toEqual([
          { name: 'Home', isBack: false },
          { name: 'Settings', isBack: false },
          { name: 'Home', isBack: true },
        ])
      })

      it('marks a reset to an earlier step as back', () => {
        capturedOnStateChange?.(stack(['VO', 'Inc']))
        capturedOnStateChange?.(stack(['VO']))

        expect(isBackFlags()).toEqual([false, true])
      })

      it('marks a reset to a new, shallower screen as fresh', () => {
        capturedOnStateChange?.(stack(['VO', 'Tips', 'StartCall', 'LiveCall']))
        capturedOnStateChange?.(stack(['VO', 'Inc']))

        expect(isBackFlags()).toEqual([false, false])
      })

      it('marks a swap to a different set of routes as fresh', () => {
        capturedOnStateChange?.(stack(['Auth', 'EnterPIN']))
        capturedOnStateChange?.(stack(['Main']))

        expect(isBackFlags()).toEqual([false, false])
      })

      it('advances the baseline even when a state change records nothing', () => {
        capturedOnStateChange?.(stack(['Home', 'Settings']))
        // Same focused screen: nothing is recorded, but Help now sits beneath Settings
        capturedOnStateChange?.(stack(['Home', 'Help', 'Settings']))
        capturedOnStateChange?.(stack(['Home', 'Help']))

        expect(NAVIGATION_TRAIL.screens).toEqual([
          { name: 'Settings', isBack: false },
          { name: 'Help', isBack: true },
        ])
      })

      it('retains a full three-pass verification flow, including its entry point, without dropping anything', () => {
        // Entry point plus three 7-screen passes is 22 entries: over the old cap of 15, well under the current one
        capturedOnStateChange?.(stack(['AccountLanding']))

        for (let pass = 0; pass < 3; pass++) {
          capturedOnStateChange?.(stack(['AccountLanding', 'VO']))
          capturedOnStateChange?.(stack(['AccountLanding', 'VO', 'Tips']))
          capturedOnStateChange?.(stack(['AccountLanding', 'VO', 'Tips', 'Capture']))
          capturedOnStateChange?.(stack(['AccountLanding', 'VO', 'Tips', 'Capture', 'Confirmation']))
          capturedOnStateChange?.(stack(['VO', 'Tips', 'StartCall']))
          capturedOnStateChange?.(stack(['VO', 'Tips', 'StartCall', 'LiveCall']))
          capturedOnStateChange?.(stack(['VO', 'Incomplete']))
        }

        expect(MAX_VISITED_SCREENS).toBe(50)
        expect(NAVIGATION_TRAIL.screens).toHaveLength(22)
        expect(NAVIGATION_TRAIL.screens[0].name).toBe('AccountLanding')
        expect(NAVIGATION_TRAIL.droppedCount).toBe(0)
      })

      it('marks only the second Verify Options as back when the issue flow is replayed', () => {
        const attempt = () => {
          capturedOnStateChange?.(stack(['AccountLanding', 'VO']))
          capturedOnStateChange?.(stack(['AccountLanding', 'VO', 'Tips']))
          capturedOnStateChange?.(stack(['AccountLanding', 'VO', 'Tips', 'Capture']))
          capturedOnStateChange?.(stack(['AccountLanding', 'VO', 'Tips', 'Capture', 'Confirmation']))
          // PhotoReview resets to [VO, Tips, StartCall]
          capturedOnStateChange?.(stack(['VO', 'Tips', 'StartCall']))
          capturedOnStateChange?.(stack(['VO', 'Tips', 'StartCall', 'LiveCall']))
          // LiveCall resets to [VO, Incomplete]
          capturedOnStateChange?.(stack(['VO', 'Incomplete']))
        }

        attempt()
        // VerifyNotComplete resets to [VO]
        capturedOnStateChange?.(stack(['VO']))
        capturedOnStateChange?.(stack(['VO', 'Tips']))
        capturedOnStateChange?.(stack(['VO', 'Tips', 'Capture']))
        capturedOnStateChange?.(stack(['VO', 'Tips', 'Capture', 'Confirmation']))
        capturedOnStateChange?.(stack(['VO', 'Tips', 'StartCall']))
        capturedOnStateChange?.(stack(['VO', 'Tips', 'StartCall', 'LiveCall']))
        capturedOnStateChange?.(stack(['VO', 'Incomplete']))

        const backNames = NAVIGATION_TRAIL.screens.filter((screen) => screen.isBack).map((screen) => screen.name)

        expect(backNames).toEqual(['VO'])
      })
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
