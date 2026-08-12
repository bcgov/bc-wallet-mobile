import { PersistentStorage } from '@bifold/core'
import { RemoteLogger } from '@bifold/remote-logs'
import axios from 'axios'
import z from 'zod'
import remoteConfigJSON from './remote-config-defaults.json'

const REMOTE_CONFIG_STORAGE_KEY = 'remoteConfigCache'
const REMOTE_CONFIG_CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const OBJECT_STORAGE_REMOTE_CONFIG_FILE_NAME = 'remote-config.json'
const OBJECT_STORAGE_REMOTE_CONFIG_BUCKET_ID = 'TODO (MD): Add your object storage bucket ID here'
const OBJECT_STORAGE_ENDPOINT = 'https://coms.api.gov.bc.ca/api/v1'

export const RemoteConfigSchema = z.strictObject({
  featureFlags: z.strictObject({
    // TODO (FF): Remove this test feature when feature flagging fully enabled
    'debug.testFeature': z.boolean(),
    // 'kill.featureX': z.boolean(),
    // 'release.featureY': z.boolean(),
    // 'experimental.featureZ': z.boolean(),
  }),
})

export type RemoteConfig = z.infer<typeof RemoteConfigSchema>

export interface CachedRemoteConfig {
  remoteConfig: RemoteConfig
  timestamp: number
}

/**
 * Retrieves the bundled remote config from the local JSON file.
 * @throws An error if the bundled remote config is invalid and the app is in development mode.
 * @returns The bundled remote config.
 */
export function getBundledRemoteConfig(): RemoteConfig {
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
 * Retrieves the remote config from a common object storage endpoint.
 * @param logger The logger to use for logging errors and information.
 * @returns The remote config if successfully fetched, otherwise null.
 */
export async function getHostedRemoteConfig(logger: RemoteLogger): Promise<RemoteConfig | null> {
  try {
    const searchResponse = await axios.get<{ id: string }>(_getObjectStorageSearchUrl())
    const objectResponse = await axios.get(_getObjectStorageGetUrl(searchResponse.data.id))

    // TODO (MD): Check what this response is
    const remoteConfig = objectResponse.data as RemoteConfig

    await cacheRemoteConfig(remoteConfig, logger)

    return remoteConfig
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
    await PersistentStorage.storeValueForKey<CachedRemoteConfig>(REMOTE_CONFIG_STORAGE_KEY, {
      remoteConfig: remoteConfig,
      timestamp: Date.now(),
    })
  } catch (error) {
    logger.error('[RemoteConfig] Error caching remote config:', error as Error)
  }
}

// -----------------------------
// HELPER FUNCTIONS
// -----------------------------

function _getObjectStorageSearchUrl(): string {
  const searchUrl = new URL(OBJECT_STORAGE_ENDPOINT)
  searchUrl.pathname = '/object'
  searchUrl.searchParams.append('bucketId', OBJECT_STORAGE_REMOTE_CONFIG_BUCKET_ID)
  searchUrl.searchParams.append('name', OBJECT_STORAGE_REMOTE_CONFIG_FILE_NAME)
  searchUrl.searchParams.append('public', 'true')
  return searchUrl.toString()
}

function _getObjectStorageGetUrl(objectId: string): string {
  const searchUrl = new URL(OBJECT_STORAGE_ENDPOINT)
  searchUrl.pathname = `/object/${objectId}`
  searchUrl.searchParams.append('download', 'proxy')
  return searchUrl.toString()
}
