import { PersistentStorage } from '@bifold/core'
import { RemoteLogger } from '@bifold/remote-logs'
import axios from 'axios'
import z from 'zod'
import remoteConfigJSON from './remote-config-defaults.json'

export const RemoteConfigSchema = z.strictObject({
  featureFlags: z.strictObject({
    // TODO (FF): Remove this test feature when feature flagging fully enabled
    'debug.testFeature': z.boolean(),
    // 'kill.featureX': z.boolean(),
    // 'release.featureY': z.boolean(),
    // 'experimental.featureZ': z.boolean(),
  }),
})

export const REMOTE_CONFIG_STORAGE_KEY = 'remoteConfigCache'
const REMOTE_CONFIG_CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const OBJECT_STORAGE_REMOTE_CONFIG_FILE_NAME = 'remote-config.json'
const OBJECT_STORAGE_REMOTE_CONFIG_BUCKET_ID = 'TODO (MD): Add your object storage bucket ID here'
const OBJECT_STORAGE_REMOTE_CONFIG_ENDPOINT = 'TODO (MD): Add your object storage endpoint here'

export type RemoteConfig = z.infer<typeof RemoteConfigSchema>

export interface CachedRemoteConfig {
  remoteConfig: RemoteConfig
  timestamp: number
}

interface RemoteConfigStrategy {
  name: string
  getRemoteConfig(logger?: RemoteLogger): Promise<RemoteConfig | null> | RemoteConfig
}

/**
 * A strategy that retrieves the remote config from a local JSON file.
 */
export const JSONRemoteConfigStrategy = {
  name: 'JSONRemoteConfig',
  getRemoteConfig(): RemoteConfig {
    const result = RemoteConfigSchema.safeParse(remoteConfigJSON)

    if (!result.success && __DEV__) {
      throw new Error(`[RemoteConfig] Default remote config is invalid: ${result.error.message}`)
    }

    if (result.success) {
      return result.data
    }

    return remoteConfigJSON as RemoteConfig
  },
} satisfies RemoteConfigStrategy

/**
 * A strategy that retrieves the remote config from persistent storage, if available and not expired.
 */
export const CachedRemoteConfigStrategy: RemoteConfigStrategy = {
  name: 'CachedRemoteConfig',
  async getRemoteConfig(logger) {
    let cachedConfig: CachedRemoteConfig | undefined

    try {
      cachedConfig = await PersistentStorage.fetchValueForKey(REMOTE_CONFIG_STORAGE_KEY)
    } catch (error) {
      logger?.error('[RemoteConfig] Error fetching cached remote config:', { error })
      return null
    }

    if (!cachedConfig) {
      logger?.info('[RemoteConfig] No cached remote config found.')
      return null
    }

    if (Date.now() - cachedConfig.timestamp > REMOTE_CONFIG_CACHE_TTL_MS) {
      logger?.info('[RemoteConfig] Cached remote config is expired.')
      return null
    }

    const result = RemoteConfigSchema.safeParse(cachedConfig.remoteConfig)

    if (!result.success) {
      logger?.info('[RemoteConfig] Cached remote config is invalid.', { error: result.error.message })
      return null
    }

    return cachedConfig.remoteConfig
  },
}

/**
 * A strategy that retrieves the remote config from a common object storage endpoint.
 */
export const CommonObjectStorageRemoteConfigStrategy: RemoteConfigStrategy = {
  name: 'COMSRemoteConfig',
  async getRemoteConfig(logger) {
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

      PersistentStorage.storeValueForKey(REMOTE_CONFIG_STORAGE_KEY, {
        remoteConfig: response.data,
        timestamp: Date.now(),
      })

      return response.data
    } catch (error) {
      logger?.error('[RemoteConfig] Error fetching remote config:', error as Error)
    }

    return null
  },
}
