import { testIdWithKey } from '@bifold/core'
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import NonProdOverlay from '../components/NonProdOverlay'
import { LoadingScreenContent, LoadingScreenContentProps } from '../features/splash-loading/LoadingScreenContent'

interface BCSCLoadingContextType {
  isLoading: boolean
  startLoading: (message?: string) => void
  stopLoading: () => void
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
 *   loadingScreen.stopLoading();
 *
 * @param {PropsWithChildren} props - The props containing child components.
 * @returns {*} {React.ReactElement} The BCSCLoadingProvider component wrapping its children.
 */
export const BCSCLoadingProvider = ({ children }: PropsWithChildren) => {
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

  const startLoading = useCallback((message?: string) => {
    setIsLoading(true)
    setLoadingMessage(message ?? null)
  }, [])

  const stopLoading = useCallback(() => {
    setIsLoading(false)
    setLoadingMessage(null)
  }, [])

  const loadingContext = useMemo(
    () => ({
      isLoading,
      startLoading,
      stopLoading,
      updateLoadingMessage: setLoadingMessage,
    }),
    [isLoading, startLoading, stopLoading]
  )

  return (
    <BCSCLoadingContext.Provider value={loadingContext}>
      {/** When loading make children invisible (still mounted) **/}
      <View style={childrenStyle} testID={testIdWithKey('BCSCLoadingProviderChildren')}>
        {children}
      </View>

      {/** Mount LoadingScreenContent component when loading **/}
      <View style={loadingStyle} testID={testIdWithKey('BCSCLoadingProviderOverlay')}>
        <LoadingScreenContent message={loadingMessage ?? undefined} />
        <NonProdOverlay />
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
 *   loadingScreen.stopLoading();
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

  useEffect(() => {
    // Start loading when the component mounts
    loadingScreen.startLoading(message)
    return () => {
      // Stop loading when the component unmounts
      loadingScreen.stopLoading()
    }
  }, [loadingScreen, message])

  // This component doesn't render anything itself, it just manages the loading state
  return null
}
