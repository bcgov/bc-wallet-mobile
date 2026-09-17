import { getBaseScreenName, getCurrentStateScreenName } from '@/bcsc-theme/navigators/stack-utils'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import { useTheme } from '@bifold/core'
import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native'
import { createContext, PropsWithChildren, useContext, useMemo, useRef, useState } from 'react'

export const navigationRef = createNavigationContainerRef()

export const MAX_VISITED_SCREENS = 15
export const NAVIGATION_VISITED_SCREEN_NAMES: string[] = []

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

          const previousScreenName = previousScreenRef.current
          const currentScreenName = getBaseScreenName(getCurrentStateScreenName(state))

          const screenTransitionKey = `${previousScreenName}->${currentScreenName}`

          // Track the screen view event only if the screen has changed
          if (currentScreenName && screenTransitionKeyRef.current !== screenTransitionKey) {
            Analytics.trackScreenEvent(currentScreenName, previousScreenName)

            screenTransitionKeyRef.current = screenTransitionKey
          }

          // Update the visited screens list only if the current screen is different from the last visited screen
          if (
            currentScreenName &&
            NAVIGATION_VISITED_SCREEN_NAMES[NAVIGATION_VISITED_SCREEN_NAMES.length - 1] !== currentScreenName
          ) {
            NAVIGATION_VISITED_SCREEN_NAMES.push(currentScreenName)
            if (NAVIGATION_VISITED_SCREEN_NAMES.length > MAX_VISITED_SCREENS) {
              NAVIGATION_VISITED_SCREEN_NAMES.shift()
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
