import { testIdWithKey } from '@bifold/core'
import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { LoadingScreenContent } from '../features/splash-loading/LoadingScreenContent'

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
    },
  })

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
      <View style={isLoading ? styles.hidden : styles.visible} testID={testIdWithKey('BCSCLoadingProviderChildren')}>
        {children}
      </View>

      {/** Mount LoadingScreenContent component when loading **/}
      {isLoading ? <LoadingScreenContent message={loadingMessage ?? undefined} /> : null}
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
