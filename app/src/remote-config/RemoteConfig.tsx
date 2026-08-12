import { PersistentStorage } from '@bifold/core'
import { RemoteLogger } from '@bifold/remote-logs'
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  CachedRemoteConfig,
  CachedRemoteConfigStrategy,
  CommonObjectStorageRemoteConfigStrategy,
  JSONRemoteConfigStrategy,
  REMOTE_CONFIG_STORAGE_KEY,
  RemoteConfig,
} from './RemoteConfigStrategy'

let REMOTE_CONFIG_CACHE = JSONRemoteConfigStrategy.getRemoteConfig()

interface RemoteConfigContextType {
  /**
   * Get the value of a remote config key.
   * @param key The key of the remote config to get.
   * @returns The value of the remote config key.
   */
  getValue: <T extends keyof RemoteConfig>(key: T) => RemoteConfig[T]
  /**
   * Set the local value of a remote config key.
   * Note: This will only update the value in memory and persistent storage - **not** the server.
   * @param key The key of the remote config to set.
   * @param value The value to set for the remote config key.
   * @returns void
   * */
  setValue: <T extends keyof RemoteConfig>(key: T, value: RemoteConfig[T]) => void
  /**
   * Indicates whether the remote config is currently being loaded.
   * @returns True if the remote config is loading, false otherwise.
   */
  loading: boolean
}

interface RemoteConfigProviderProps extends PropsWithChildren {
  logger: RemoteLogger
}

const RemoteConfigContext = createContext<RemoteConfigContextType | null>(null)

/**
 * RemoteConfigProvider is a React context provider that initializes and provides access to the remote configuration throughout the app.
 * @param props The props for the RemoteConfigProvider, including children and a logger.
 * @returns A React context provider that wraps its children and provides access to the remote configuration.
 */
export const RemoteConfigProvider = (props: RemoteConfigProviderProps) => {
  const [loading, setLoading] = useState(true)
  const [remoteConfig, setRemoteConfigState] = useState<RemoteConfig>(REMOTE_CONFIG_CACHE)

  const setRemoteConfig = useCallback((newConfig: RemoteConfig) => {
    REMOTE_CONFIG_CACHE = newConfig
    setRemoteConfigState(newConfig)
    PersistentStorage.storeValueForKey<CachedRemoteConfig>(REMOTE_CONFIG_STORAGE_KEY, {
      remoteConfig: newConfig,
      timestamp: Date.now(),
    })
  }, [])

  const getValue = useCallback(
    <T extends keyof RemoteConfig>(key: T): RemoteConfig[T] => {
      return remoteConfig[key]
    },
    [remoteConfig]
  )

  const setValue = useCallback(
    <T extends keyof RemoteConfig>(key: T, value: RemoteConfig[T]) => {
      setRemoteConfig({
        ...remoteConfig,
        [key]: value,
      })
    },
    [remoteConfig, setRemoteConfig]
  )

  useEffect(() => {
    const load = async () => {
      try {
        const remoteConfig = await _initRemoteConfig(props.logger)
        setRemoteConfig(remoteConfig)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [props.logger, setRemoteConfig])

  const context = useMemo(() => ({ getValue, setValue, loading }), [getValue, setValue, loading])

  return <RemoteConfigContext.Provider value={context}>{props.children}</RemoteConfigContext.Provider>
}

// -----------------------------
// PUBLIC API
// -----------------------------

/**
 * Hook to access the remote config context. Must be used within a RemoteConfigProvider.
 * @returns The remote config context value, including the current remote config, a setter function, and a loading state.
 */
export const useRemoteConfig = () => {
  const context = useContext(RemoteConfigContext)

  if (!context) {
    throw new Error('useRemoteConfig must be used within a RemoteConfigProvider')
  }

  return context
}

/**
 * Get the current remote config from memory cache.
 * @returns The current remote config object.
 */
export function getRemoteConfig(): RemoteConfig {
  if (!REMOTE_CONFIG_CACHE) {
    throw new Error(
      '[RemoteConfig] Remote config has not been initialized. Please use the RemoteConfigProvider to initialize it.'
    )
  }

  return REMOTE_CONFIG_CACHE
}

// -----------------------------
// HELPER FUNCTIONS
// -----------------------------

async function _initRemoteConfig(logger: RemoteLogger): Promise<RemoteConfig> {
  const strategies = [CachedRemoteConfigStrategy, CommonObjectStorageRemoteConfigStrategy, JSONRemoteConfigStrategy]

  for (const strategy of strategies) {
    const remoteConfig = await strategy.getRemoteConfig(logger)

    if (remoteConfig) {
      logger.info(`[RemoteConfig] Using remote config from strategy: ${strategy.name}`)
      return remoteConfig
    }
  }

  // Impossible to reach here if JSONRemoteConfigStrategy is always valid, but just in case
  throw new Error('[RemoteConfig] Failed to initialize remote config from all strategies.')
}
