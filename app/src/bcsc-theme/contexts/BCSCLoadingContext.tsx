import { WaitingScreenContent } from '@/bcsc-theme/components/WaitingScreenContent'
import { TestIds } from '@/test-ids/registry'
import { testIdWithKey } from '@bifold/core'
import { createContext, PropsWithChildren, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

interface LoadingOptions {
  statusMessage?: string
  progressPercent?: number
}

interface LoadingScreenProps extends LoadingOptions {
  message?: string
}

interface BCSCLoadingContextType {
  isLoading: boolean
  loadingMessage: string | null
  /** Returns an idempotent release function. The overlay stays visible until every loader releases it. */
  startLoading: (message?: string, options?: LoadingOptions) => () => void
  updateLoadingMessage: (message: string) => void
}

export const BCSCLoadingContext = createContext<BCSCLoadingContextType | null>(null)

export const BCSCLoadingProvider = ({ children }: PropsWithChildren) => {
  const { t } = useTranslation()
  const [loaders, setLoaders] = useState(new Map<symbol, LoadingScreenProps>())
  const isLoading = loaders.size > 0
  const activeLoaders = useMemo(() => Array.from(loaders.values()).reverse(), [loaders])
  const loadingMessage = activeLoaders.find((loader) => loader.message !== undefined)?.message ?? null
  const options = activeLoaders[0]

  const startLoading = useCallback((message?: string, options?: LoadingOptions) => {
    const token = Symbol()
    setLoaders((current) => new Map(current).set(token, { message, ...options }))
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

  const updateLoadingMessage = useCallback((message: string) => {
    setLoaders((current) => {
      const token = Array.from(current.keys()).at(-1)
      return token ? new Map(current).set(token, { ...current.get(token), message }) : current
    })
  }, [])

  const context = useMemo(
    () => ({ isLoading, loadingMessage, startLoading, updateLoadingMessage }),
    [isLoading, loadingMessage, startLoading, updateLoadingMessage]
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
          statusMessage={options?.statusMessage}
          progressPercent={options?.progressPercent}
          active={isLoading}
          testID={testIdWithKey(TestIds.common.loadingScreen)}
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

export const LoadingScreen = ({ message, statusMessage, progressPercent }: LoadingScreenProps) => {
  const { startLoading } = useLoadingScreen()
  useLayoutEffect(
    () => startLoading(message, { statusMessage, progressPercent }),
    [startLoading, message, statusMessage, progressPercent]
  )
  return null
}

const styles = StyleSheet.create({
  visible: { flex: 1, display: 'flex' },
  hidden: { display: 'none', pointerEvents: 'none' },
})
