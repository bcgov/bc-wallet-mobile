import { PersistentStorage } from '@bifold/core'
import { RemoteLogger } from '@bifold/remote-logs'
import axios from 'axios'
import z from 'zod'
import remoteConfigJSON from './prod-remote-config.json'

const REMOTE_CONFIG_STORAGE_KEY = 'remoteConfigCache'
const REMOTE_CONFIG_CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const OBJECT_STORAGE_SERVER_ENDPOINT = 'https://idim.objectstore.gov.bc.ca'
const OBJECT_STORAGE_REMOTE_CONFIG_BUCKET_NAME = 'bcsc-mobile-prod-remote-configuration'
const OBJECT_STORAGE_REMOTE_CONFIG_FILE_NAME = 'prod-remote-config.json'
const OBJECT_STORAGE_REMOTE_CONFIG_URL = `${OBJECT_STORAGE_SERVER_ENDPOINT}/${OBJECT_STORAGE_REMOTE_CONFIG_BUCKET_NAME}/${OBJECT_STORAGE_REMOTE_CONFIG_FILE_NAME}`

/**
 * RemoteConfigSchema defines the expected structure of the remote configuration object.
 *
 * - looseObject: allows for additional properties (ie: hosted remote config expands)
 * - catch: provides default values for missing properties (ie: hosted remote config shrinks)
 */
export const RemoteConfigSchema = z.looseObject({
  featureFlags: z.looseObject({
    // TODO (FF): Remove this test feature when feature flagging fully enabled
    'debug.testFeature': z.boolean().catch(false),
    // 'kill.featureX': z.boolean(),
    // 'release.featureY': z.boolean(),
    // 'experimental.featureZ': z.boolean(),
  }),
})

// StrictRemoteConfigSchema is used to validate the bundled default remote config JSON file
const StrictRemoteConfigSchema = z.strictObject({
  featureFlags: z.strictObject({
    'debug.testFeature': z.boolean(),
  }),
})

export type RemoteConfig = z.infer<typeof StrictRemoteConfigSchema>

export interface CachedRemoteConfig {
  remoteConfig: RemoteConfig
  timestamp: number
}

/**
 * Retrieves the bundled remote config from the local JSON file.
 * @throws An error if the bundled remote config is invalid
 * @returns The bundled remote config.
 */
export function getBundledRemoteConfig(): RemoteConfig {
  const result = StrictRemoteConfigSchema.safeParse(remoteConfigJSON)

  if (!result.success) {
    throw new Error(`[RemoteConfig] Bundled default remote config is invalid: ${result.error.message}`)
  }

  return result.data
}

/**
 * Retrieves the cached remote config from persistent storage, if available and not expired.
 * @param logger The logger to use for logging errors and information.
 * @returns The cached remote config if available and valid, otherwise null.
 */
export async function getCachedRemoteConfig(logger: RemoteLogger): Promise<RemoteConfig | null> {
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

  if (Date.now() - cachedConfig.timestamp > REMOTE_CONFIG_CACHE_TTL_MS) {
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

/**
 * Retrieves the remote config from the object storage
 * @param logger The logger to use for logging errors and information.
 * @returns The remote config if successfully fetched, otherwise null.
 */
export async function fetchRemoteConfig(logger: RemoteLogger): Promise<RemoteConfig | null> {
  try {
    logger.info('[RemoteConfig] Fetching remote config from object storage.', { url: OBJECT_STORAGE_REMOTE_CONFIG_URL })
    const response = await axios.get(OBJECT_STORAGE_REMOTE_CONFIG_URL)

    const result = RemoteConfigSchema.safeParse(response.data)

    if (!result.success) {
      logger.error('[RemoteConfig] Object storage remote config is invalid.', { error: result.error.message })
      return null
    }

    return result.data
  } catch (error) {
    logger.error('[RemoteConfig] Error fetching remote config:', error as Error)
  }

  return null
}

/**
 * Caches the remote config in persistent storage.
 * @param remoteConfig The remote config to cache.
 * @param logger The logger to use for logging errors.
 * @returns A promise that resolves when the caching is complete.
 */
export async function cacheRemoteConfig(remoteConfig: RemoteConfig, logger: RemoteLogger): Promise<void> {
  try {
    logger.info('[RemoteConfig] Caching remote config.')
    await PersistentStorage.storeValueForKey<CachedRemoteConfig>(REMOTE_CONFIG_STORAGE_KEY, {
      remoteConfig: remoteConfig,
      timestamp: Date.now(),
    })
  } catch (error) {
    logger.error('[RemoteConfig] Error caching remote config:', error as Error)
  }
}
