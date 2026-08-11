import { PersistentStorage } from '@bifold/core'
import { RemoteLogger } from '@bifold/remote-logs'
import axios from 'axios'
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import z from 'zod'
import remoteConfigJSON from './remote-config-defaults.json'

const RemoteConfigSchema = z.strictObject({
  featureFlags: z.strictObject({
    // TODO (FF): Remove this test feature when feature flagging fully enabled
    'debug.testFeature': z.boolean(),
    // 'kill.featureX': z.boolean(),
    // 'release.featureY': z.boolean(),
  }),
})

const OBJECT_STORAGE_REMOTE_CONFIG_FILE_NAME = 'remote-config.json'
const OBJECT_STORAGE_REMOTE_CONFIG_BUCKET_ID = 'TODO (MD): Add your object storage bucket ID here'
const OBJECT_STORAGE_REMOTE_CONFIG_ENDPOINT = 'TODO (MD): Add your object storage endpoint here'

let REMOTE_CONFIG_CACHE = _parseDefaultRemoteConfig()
const REMOTE_CONFIG_STORAGE_KEY = 'remoteConfigCache'
const REMOTE_CONFIG_CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export type RemoteConfig = z.infer<typeof RemoteConfigSchema>

interface CachedRemoteConfig {
  remoteConfig: RemoteConfig
  timestamp: number
}

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

/**
 * Init the remote config by fetching it from the server or using the cached version if available and valid.
 * @returns The initialized remote config object.
 */
async function _initRemoteConfig(logger: RemoteLogger): Promise<RemoteConfig> {
  const cachedConfig = await _getCachedRemoteConfig(REMOTE_CONFIG_CACHE_TTL_MS, logger)

  if (cachedConfig) {
    logger.info('[RemoteConfig] Using cached remote config.')
    return cachedConfig
  }

  const remoteConfig = await _fetchRemoteConfig(logger)

  if (!remoteConfig) {
    logger.info('[RemoteConfig] Using default remote config.')
    return RemoteConfigSchema.parse(remoteConfigJSON)
  }

  // Store the remote config in persistent storage for future use
  try {
    await PersistentStorage.storeValueForKey<CachedRemoteConfig>(REMOTE_CONFIG_STORAGE_KEY, {
      remoteConfig: remoteConfig,
      timestamp: Date.now(),
    })
  } catch (error) {
    logger.error('[RemoteConfig] Error storing remote config in persistent storage:', error as Error)
  }

  logger.info('[RemoteConfig] Fetched and cached new remote config.')

  return remoteConfig
}

/**
 * Parse the default remote config from the JSON file and validate it against the schema.
 * @returns The parsed and validated default remote config object.
 */
function _parseDefaultRemoteConfig(): RemoteConfig {
  const result = RemoteConfigSchema.safeParse(remoteConfigJSON)

  if (!result.success && __DEV__) {
    throw new Error(`[RemoteConfig] Default remote config is invalid: ${result.error.message}`)
  }

  if (result.success) {
    return result.data
  }

  return remoteConfigJSON as RemoteConfig
}

/**
 * Fetch the remote config from the server.
 * @returns The fetched remote config object, or null if the fetch failed.
 */
async function _fetchRemoteConfig(logger: RemoteLogger): Promise<RemoteConfig | null> {
  const objectSearchUrl = new URL(OBJECT_STORAGE_REMOTE_CONFIG_ENDPOINT)

  objectSearchUrl.searchParams.append('bucketId', OBJECT_STORAGE_REMOTE_CONFIG_BUCKET_ID)
  objectSearchUrl.searchParams.append('public', 'true')
  objectSearchUrl.searchParams.append('name', OBJECT_STORAGE_REMOTE_CONFIG_FILE_NAME)

  try {
    const response = await axios.get<RemoteConfig>(objectSearchUrl.toString(), {
      headers: {
        // 'Content-Type': 'application/octet-stream',
        // Authorization: `Basic ${authorization}`,
        // 'x-amz-bucket': options.bucketName,
        // 'x-amz-endpoint': options.serviceEndpoint,
      },
    })
    return response.data
  } catch (error) {
    logger.error('[RemoteConfig] Error fetching remote config:', error as Error)
  }

  return null
}

/**
 * Get the cached remote config from persistent storage if it exists and is valid.
 * @param cacheMs The maximum age of the cached config in milliseconds.
 * @param logger The logger to use for logging errors and info.
 * @returns The cached remote config object, or null if it doesn't exist or is invalid.
 */
async function _getCachedRemoteConfig(cacheMs: number, logger: RemoteLogger): Promise<RemoteConfig | null> {
  let cachedConfig: CachedRemoteConfig | undefined

  try {
    cachedConfig = await PersistentStorage.fetchValueForKey(REMOTE_CONFIG_STORAGE_KEY)
  } catch (error) {
    logger.error('[RemoteConfig] Error fetching cached remote config:', { error })
    return null
  }

  if (!cachedConfig) {
    logger.info('[RemoteConfig] No cached remote config found.')
    return null
  }

  if (Date.now() - cachedConfig.timestamp > cacheMs) {
    logger.info('[RemoteConfig] Cached remote config is expired.')
    return null
  }

  const result = RemoteConfigSchema.safeParse(cachedConfig.remoteConfig)

  if (!result.success) {
    logger.info('[RemoteConfig] Cached remote config is invalid.', { error: result.error.message })
    return null
  }

  return cachedConfig.remoteConfig
}
