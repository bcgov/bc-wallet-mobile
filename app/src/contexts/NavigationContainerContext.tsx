import {
  getBaseScreenName,
  getCurrentStateScreenName,
  getRouteNamesBelowFocus,
} from '@/bcsc-theme/navigators/stack-utils'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import { useTheme } from '@bifold/core'
import { createNavigationContainerRef, NavigationContainer, NavigationState } from '@react-navigation/native'
import { createContext, PropsWithChildren, useContext, useMemo, useRef, useState } from 'react'

export const navigationRef = createNavigationContainerRef()

export interface VisitedScreen {
  /** Display name, with any stack prefix removed. */
  name: string
  /** True when the user returned to a screen that was already beneath them in the stack. */
  isBack: boolean
}

export const MAX_VISITED_SCREENS = 50

export const NAVIGATION_TRAIL: { screens: VisitedScreen[]; droppedCount: number } = {
  screens: [],
  droppedCount: 0,
}

export interface NavigationContainerContextType {
  isNavigationReady: boolean
}

export const NavigationContainerContext = createContext<NavigationContainerContextType | null>(null)

/**
 * NavigationContainerProvider component that wraps the app's navigation container.
 *
 * @returns {*} {React.ReactElement}
 */
export const NavigationContainerProvider = ({ children }: PropsWithChildren): React.JSX.Element => {
  const [navigationReady, setNavigationReady] = useState(false)
  const { NavigationTheme } = useTheme()
  const screenTransitionKeyRef = useRef<string>('')
  const previousScreenRef = useRef<string | undefined>(undefined)
  const previousStateRef = useRef<NavigationState | undefined>(undefined)

  const navigationContext = useMemo(
    () => ({
      isNavigationReady: navigationReady,
    }),
    [navigationReady]
  )

  return (
    <NavigationContainerContext.Provider value={navigationContext}>
      <NavigationContainer
        ref={navigationRef}
        theme={NavigationTheme}
        onReady={() => {
          setNavigationReady(true)
        }}
        onStateChange={async (state) => {
          if (!state) {
            return
          }

          // Advance before any early exit so a state change that records nothing still moves the baseline
          const previousState = previousStateRef.current
          previousStateRef.current = state

          const previousScreenName = previousScreenRef.current
          const currentRouteName = getCurrentStateScreenName(state)
          const currentScreenName = getBaseScreenName(currentRouteName)

          const screenTransitionKey = `${previousScreenName}->${currentScreenName}`

          // Track the screen view event only if the screen has changed
          if (currentScreenName && screenTransitionKeyRef.current !== screenTransitionKey) {
            Analytics.trackScreenEvent(currentScreenName, previousScreenName)

            screenTransitionKeyRef.current = screenTransitionKey
          }

          // Update the visited screens list only if the current screen is different from the last visited screen
          const { screens } = NAVIGATION_TRAIL
          if (currentScreenName && screens[screens.length - 1]?.name !== currentScreenName) {
            // Raw (stack-prefixed) names are compared so same-named screens in different stacks never match
            const isBack =
              previousState !== undefined && getRouteNamesBelowFocus(previousState).includes(currentRouteName)

            screens.push({ name: currentScreenName, isBack })
            if (screens.length > MAX_VISITED_SCREENS) {
              // Index 0 is the session entry point and is never evicted
              screens.splice(1, 1)
              NAVIGATION_TRAIL.droppedCount += 1
            }
          }

          previousScreenRef.current = currentScreenName
        }}
      >
        {children}
      </NavigationContainer>
    </NavigationContainerContext.Provider>
  )
}

/**
 * Hook to access the NavigationContainerContext.
 *
 * @returns {*} {NavigationContainerContextType}
 */
export const useNavigationContainer = () => {
  const context = useContext(NavigationContainerContext)

  if (!context) {
    throw new Error('useNavigationContainer must be used within a NavigationContainerProvider')
  }

  return context
}
