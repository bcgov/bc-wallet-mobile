import { Analytics } from '@/utils/analytics/analytics-tracker'
import { useTheme } from '@bifold/core'
import { NavigationContainer } from '@react-navigation/native'
import { navigationRef } from 'App'
import { createContext, PropsWithChildren, useContext, useRef, useState } from 'react'

export interface NavigationContainerContextType {
  isNavigationReady: boolean
}

export const NavigationContainerContext = createContext<NavigationContainerContextType | null>(null)

/**
 * NavigationContainerProvider component that wraps the app's navigation container.
 *
 * TODO (MD): Move this code into Bifold? Putting here now to unblock analytics implementation.
 *
 * @returns {*} {JSX.Element}
 */
export const NavigationContainerProvider = ({ children }: PropsWithChildren) => {
  const [navigationReady, setNavigationReady] = useState(false)
  const { NavigationTheme } = useTheme()
  const routeNameRef = useRef<string | undefined>()

  return (
    <NavigationContainerContext.Provider value={{ isNavigationReady: navigationReady }}>
      <NavigationContainer
        ref={navigationRef}
        theme={NavigationTheme}
        onReady={() => {
          routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name
          setNavigationReady(true)
        }}
        onStateChange={async () => {
          if (Analytics.hasTracker() === false) {
            Analytics.enableTracking()
            await Analytics.initializeTracker()
          }

          const previousRouteName = routeNameRef.current
          const currentRouteName = navigationRef.current?.getCurrentRoute()?.name

          // Track the screen view event only if the route has changed
          if (currentRouteName && previousRouteName !== currentRouteName) {
            // TODO (MD): add ref to check if this has already been tracked
            Analytics.trackScreenEvent(currentRouteName, previousRouteName)
          }

          routeNameRef.current = currentRouteName
        }}
      >
        {children}
      </NavigationContainer>
    </NavigationContainerContext.Provider>
  )
}

export const useNavigationContainer = () => {
  const context = useContext(NavigationContainerContext)

  if (!context) {
    throw new Error('useNavigationContainer must be used within a NavigationContainerProvider')
  }

  return context
}
