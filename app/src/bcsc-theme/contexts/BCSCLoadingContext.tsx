import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react'
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
 * @param {PropsWithChildren} props - The props containing child components.
 * @returns {*} {JSX.Element} The BCSCLoadingProvider component wrapping its children.
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

  const startLoading = (message?: string) => {
    setIsLoading(true)
    setLoadingMessage(message ? message : null)
  }

  const stopLoading = () => {
    setIsLoading(false)
    setLoadingMessage(null)
  }

  const loadingContext = useMemo(
    () => ({
      isLoading,
      startLoading,
      stopLoading,
      updateLoadingMessage: setLoadingMessage,
    }),
    [isLoading]
  )

  return (
    <BCSCLoadingContext.Provider value={loadingContext}>
      {/** Keep the children mounted but make the content invisible **/}
      <View style={isLoading ? styles.hidden : styles.visible}>{children}</View>

      {/** Render the loading screen content **/}
      {isLoading ? <LoadingScreenContent message={loadingMessage ?? undefined} /> : null}
    </BCSCLoadingContext.Provider>
  )
}

/**
 * Hook to access the BCSC loading screen context.
 *
 * @returns {*} {BCSCLoadingContextType} The loading screen context.
 */
export const useLoadingScreen = () => {
  const context = useContext(BCSCLoadingContext)

  if (!context) {
    throw new Error('useLoading must be used within a BCSCLoadingContextProvider')
  }

  return context
}
