import { WaitingScreenContent } from '@/bcsc-theme/components/WaitingScreenContent'
import { TestIds } from '@/test-ids/registry'
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
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

interface LoadingScreenProps {
  message?: string
}

interface BCSCLoadingContextType {
  isLoading: boolean
  loadingMessage: string | null
  /**
   * Returns an idempotent release function. The overlay stays visible until every loader releases it.
   *
   * Releasing a loader the overlay has shown takes effect one commit late: the overlay still counts it in
   * the commit the release lands in and drops it in the next, flushed before that commit paints. A state
   * change batched with the release, such as the root route change dispatched in the same continuation as
   * `handleSuccessfulAuth` resolves, is therefore rendered beneath the overlay: the root decides a cut
   * rather than a slide from the screen the overlay had hidden, and a stack mounting then finds the overlay
   * up and extends it. A loader released before it was ever shown is dropped at once, as nothing was
   * hidden beneath it.
   */
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
  // Shown loaders released since the last commit: they stay in `loaders` until that commit has landed
  const [released, setReleased] = useState(new Set<symbol>())
  // The loaders the latest commit shows, read when one is released
  const shownRef = useRef(new Set<symbol>())
  const isLoading = loaders.size > 0
  const activeLoaders = useMemo(() => Array.from(loaders.values()).reverse(), [loaders])
  const loadingMessage = activeLoaders.find((message) => message !== undefined) ?? null

  useLayoutEffect(() => {
    shownRef.current = new Set(loaders.keys())
  }, [loaders])

  // Drops the released loaders once the commit carrying their release has landed. A layout effect, so the
  // drop is flushed before that commit paints and the deferral costs no frame
  useLayoutEffect(() => {
    if (released.size === 0) {
      return
    }

    setLoaders((current) => {
      const next = new Map(current)
      released.forEach((token) => next.delete(token))
      return next
    })
    // Only this commit's releases: one landing between this commit and the flush stays pending
    setReleased((current) => {
      const next = new Set(current)
      released.forEach((token) => next.delete(token))
      return next
    })
  }, [released])

  const startLoading = useCallback((message?: string) => {
    const token = Symbol()
    setLoaders((current) => new Map(current).set(token, message))
    return () => {
      if (shownRef.current.has(token)) {
        setReleased((current) => (current.has(token) ? current : new Set(current).add(token)))
        return
      }

      // Never shown, or already dropped: nothing to keep up
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
