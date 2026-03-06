import { testIdWithKey } from '@bifold/core'
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { StyleSheet, View } from 'react-native'
import { LoadingScreenContent, LoadingScreenContentProps } from '../features/splash-loading/LoadingScreenContent'

interface BCSCLoadingContextType {
  isLoading: boolean
  startLoading: (message?: string) => () => void
  updateLoadingMessage: (message: string) => void
}

export const BCSCLoadingContext = createContext<BCSCLoadingContextType | null>(null)

/**
 * Provides the BCSCLoadingContext to child components.
 *
 * This provides a convenient API to show and hide a loading screen overlay.
 *
 * @example
 *   const loadingScreen = useLoadingScreen();
 *
 *   loadingScreen.startLoading("Loading data...");
 *   loadingScreen.updateLoadingMessage("Still loading, please wait...");
 *
 * @param {PropsWithChildren} props - The props containing child components.
 * @returns {*} {React.ReactElement} The BCSCLoadingProvider component wrapping its children.
 */
export const BCSCLoadingProvider = ({ children }: PropsWithChildren) => {
  // Using a Set to track active loaders allows for multiple concurrent loading states without conflicts
  const loadersRef = useRef(new Set<symbol>())
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null)

  const styles = StyleSheet.create({
    visible: {
      flex: 1,
      display: 'flex',
    },
    hidden: {
      display: 'none',
      pointerEvents: 'none', // Ensure hidden content doesn't intercept touches
    },
  })

  const childrenStyle = isLoading ? styles.hidden : styles.visible
  const loadingStyle = isLoading ? styles.visible : styles.hidden

  /**
   * Starts the loading state and returns a function to stop it.
   *
   * Note: All calls to startLoading must be stopped for the loading screen to disappear.
   * Allowing for multiple overlapping loading states without prematurely hiding the screen.
   *
   * @example
   *   const stopLoading = loadingScreen.startLoading("Loading data...");
   *   try {
   *      await someAsyncFunction();
   *  } finally {
   *      stopLoading(); // Call this once the async work is done to hide the loading screen
   *  }
   *
   * @param - Optional message to display on the loading screen.
   * @returns A function that, when called, will stop the loading state.
   */
  const startLoading = useCallback((message?: string) => {
    const loadingToken = Symbol()
    loadersRef.current.add(loadingToken)
    setIsLoading(true)

    if (message) {
      // Only update the message if it's intentional
      setLoadingMessage(message)
    }

    return () => {
      loadersRef.current.delete(loadingToken)
      // Only once all loaders have been stopped do we hide the loading screen
      if (loadersRef.current.size === 0) {
        setIsLoading(false)
        setLoadingMessage(null)
      }
    }
  }, [])

  const loadingContext = useMemo(
    () => ({
      isLoading,
      startLoading,
      updateLoadingMessage: setLoadingMessage,
    }),
    [isLoading, startLoading]
  )

  return (
    <BCSCLoadingContext.Provider value={loadingContext}>
      {/** When loading make children invisible (still mounted) **/}
      <View
        style={childrenStyle}
        testID={testIdWithKey('BCSCLoadingProviderChildren')}
        importantForAccessibility={isLoading ? 'no-hide-descendants' : 'yes'} // Hide from screen readers when loading, show when not loading
      >
        {children}
      </View>

      {/** Mount LoadingScreenContent component when loading **/}
      <View
        style={loadingStyle}
        testID={testIdWithKey('BCSCLoadingProviderOverlay')}
        accessible={isLoading} // Only make the loading screen accessible when it's visible
        importantForAccessibility={isLoading ? 'yes' : 'no-hide-descendants'} // Hide from screen readers when not visible, show when visible
      >
        <LoadingScreenContent message={loadingMessage ?? undefined} />
      </View>
    </BCSCLoadingContext.Provider>
  )
}

/**
 * Hook to access the BCSC loading screen context.
 *
 * @example
 *   const loadingScreen = useLoadingScreen();
 *
 *   loadingScreen.startLoading("Loading data...");
 *   loadingScreen.updateLoadingMessage("Still loading, please wait...");
 *
 * @returns {*} {BCSCLoadingContextType} The loading screen context.
 */
export const useLoadingScreen = () => {
  const context = useContext(BCSCLoadingContext)

  if (!context) {
    throw new Error('useLoadingScreen must be used within a BCSCLoadingContextProvider')
  }

  return context
}

/**
 * A wrapper component that manages the loading state using the useLoadingScreen hook.
 *
 * @param props - The props for the LoadingScreen component, including an optional message to display.
 * @returns The LoadingScreen component that starts the loading state on mount and stops it on unmount.
 */
export const LoadingScreen = ({ message }: LoadingScreenContentProps) => {
  const loadingScreen = useLoadingScreen()

  // Runs before the component is painted to the screen, ensuring the loading state is active immediately on mount and cleaned up on unmount
  useLayoutEffect(() => {
    // Start loading when the component mounts
    const stopLoading = loadingScreen.startLoading(message)

    // Stop loading when the component unmounts
    return stopLoading
  }, [loadingScreen, message])

  // This component doesn't render anything itself, it just manages the loading state
  return null
}
