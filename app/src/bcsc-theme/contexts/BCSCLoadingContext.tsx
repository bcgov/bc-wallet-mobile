import { WaitingScreenContent } from '@/bcsc-theme/components/WaitingScreenContent'
import { TestIds } from '@/test-ids/registry'
import { testIdWithKey } from '@bifold/core'
import { createContext, PropsWithChildren, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

interface LoadingScreenProps {
  message?: string
}

interface BCSCLoadingContextType {
  isLoading: boolean
  loadingMessage: string | null
  /** Returns an idempotent release function. The overlay stays visible until every loader releases it. */
  startLoading: (message?: string) => () => void
}

export const BCSCLoadingContext = createContext<BCSCLoadingContextType | null>(null)

export const BCSCLoadingProvider = ({ children }: PropsWithChildren) => {
  const styles = StyleSheet.create({
    visible: { flex: 1, display: 'flex' },
    hidden: { display: 'none', pointerEvents: 'none' },
  })
  const { t } = useTranslation()
  const [loaders, setLoaders] = useState(new Map<symbol, string | undefined>())
  const isLoading = loaders.size > 0
  const activeLoaders = useMemo(() => Array.from(loaders.values()).reverse(), [loaders])
  const loadingMessage = activeLoaders.find((message) => message !== undefined) ?? null

  const startLoading = useCallback((message?: string) => {
    const token = Symbol()
    setLoaders((current) => new Map(current).set(token, message))
    return () => {
      setLoaders((current) => {
        if (!current.has(token)) {
          return current
        }
        const next = new Map(current)
        next.delete(token)
        return next
      })
    }
  }, [])

  const context = useMemo(
    () => ({ isLoading, loadingMessage, startLoading }),
    [isLoading, loadingMessage, startLoading]
  )

  return (
    <BCSCLoadingContext.Provider value={context}>
      <View
        style={isLoading ? styles.hidden : styles.visible}
        testID={testIdWithKey(TestIds.common.loadingChildren)}
        importantForAccessibility={isLoading ? 'no-hide-descendants' : 'yes'}
      >
        {children}
      </View>
      <View
        style={isLoading ? styles.visible : styles.hidden}
        testID={testIdWithKey(TestIds.common.loadingOverlay)}
        accessible={isLoading}
        accessibilityElementsHidden={!isLoading}
        importantForAccessibility={isLoading ? 'yes' : 'no-hide-descendants'}
      >
        <WaitingScreenContent
          message={loadingMessage ?? t('BCSC.Loading.DefaultMessage')}
          active={isLoading}
          testIDKey={TestIds.common.loadingScreen}
        />
      </View>
    </BCSCLoadingContext.Provider>
  )
}

export const useLoadingScreen = () => {
  const context = useContext(BCSCLoadingContext)
  if (!context) {
    throw new Error('useLoadingScreen must be used within a BCSCLoadingContextProvider')
  }
  return context
}

export const LoadingScreen = ({ message }: LoadingScreenProps) => {
  const { startLoading } = useLoadingScreen()
  useLayoutEffect(() => startLoading(message), [startLoading, message])
  return null
}
