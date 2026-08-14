import { RemoteLogger } from '@bifold/remote-logs'
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  cacheRemoteConfig,
  fetchRemoteConfig,
  getBundledRemoteConfig,
  getCachedRemoteConfig,
  RemoteConfig,
} from './remote-config-utils'

let REMOTE_CONFIG_CACHE = getBundledRemoteConfig()

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
  const initializedRef = useRef(false)

  /**
   * Sets the remote config in memory and persistent storage.
   * @param newConfig The new remote config to set.
   * @returns void
   */
  const setRemoteConfig = useCallback(
    (newConfig: RemoteConfig) => {
      REMOTE_CONFIG_CACHE = newConfig
      setRemoteConfigState(newConfig)
      cacheRemoteConfig(newConfig, props.logger)
    },
    [props.logger]
  )

  /**
   * Get the value of a remote config key.
   * @param key The key of the remote config to get.
   * @returns The value of the remote config key.
   */
  const getValue = useCallback(
    <T extends keyof RemoteConfig>(key: T): RemoteConfig[T] => {
      return remoteConfig[key]
    },
    [remoteConfig]
  )

  /**
   * Set the local value of a remote config key.
   * Note: This will only update the value in memory and persistent storage - **not** the server.
   * @param key The key of the remote config to set.
   * @param value The value to set for the remote config key.
   * @returns void
   */
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
    if (initializedRef.current) {
      return
    }

    const load = async () => {
      try {
        const remoteConfig = await _initRemoteConfig(props.logger)
        setRemoteConfig(remoteConfig)
      } finally {
        setLoading(false)
        initializedRef.current = true
      }
    }

    load()
  }, [props.logger, setRemoteConfig])

  const context = useMemo(
    () => ({
      getValue,
      setValue,
      loading,
    }),
    [getValue, setValue, loading]
  )

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
  // 1. Try to get the cached remote config from persistent storage
  const cachedRemoteConfig = await getCachedRemoteConfig(logger)

  // Valid shape and not expired
  if (cachedRemoteConfig) {
    logger.info('[RemoteConfig] Using cached remote config.')
    return cachedRemoteConfig
  }

  // 2. Fetch the remote config from the server (object storage)
  const hostedRemoteConfig = await fetchRemoteConfig(logger)

  if (hostedRemoteConfig) {
    logger.info('[RemoteConfig] Using hosted remote config.')
    await cacheRemoteConfig(hostedRemoteConfig, logger)
    return hostedRemoteConfig
  }

  // THOUGHT (MD): Maybe use the expired cached config if the hosted remote config fetch fails

  // 3. Fallback to the bundled remote config
  logger.info('[RemoteConfig] Using bundled remote config.')
  return getBundledRemoteConfig()
}
