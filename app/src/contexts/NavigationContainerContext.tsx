import { Analytics } from '@/utils/analytics/analytics-singleton'
import { useTheme } from '@bifold/core'
import { NavigationContainer } from '@react-navigation/native'
import { navigationRef } from 'App'
import { createContext, PropsWithChildren, useContext, useMemo, useRef, useState } from 'react'

export interface NavigationContainerContextType {
  isNavigationReady: boolean
}

export const NavigationContainerContext = createContext<NavigationContainerContextType | null>(null)

/**
 * NavigationContainerProvider component that wraps the app's navigation container.
 *
 * @returns {*} {JSX.Element}
 */
export const NavigationContainerProvider = ({ children }: PropsWithChildren) => {
  const [navigationReady, setNavigationReady] = useState(false)
  const { NavigationTheme } = useTheme()
  const screenTransitionKeyRef = useRef<string>('')
  const routeNameRef = useRef<string | undefined>()

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
          routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name
          setNavigationReady(true)
        }}
        onStateChange={async () => {
          const previousRouteName = routeNameRef.current
          const currentRouteName = navigationRef.current?.getCurrentRoute()?.name

          const screenTransitionKey = `${previousRouteName}->${currentRouteName}`

          // Track the screen view event only if the route has changed
          if (currentRouteName && screenTransitionKeyRef.current !== screenTransitionKey) {
            Analytics.trackScreenEvent(currentRouteName, previousRouteName)

            screenTransitionKeyRef.current = screenTransitionKey
          }

          routeNameRef.current = currentRouteName
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
 * TODO (MD): Use this hook in `useSystemChecks` to delay system checks until navigation is ready.
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
