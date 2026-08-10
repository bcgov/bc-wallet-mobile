import { RemoteLogger } from '@bifold/remote-logs'
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import z from 'zod'
import remoteConfigJSON from './remoteconfig.json'

const RemoteConfigSchema = z.strictObject({
  FEATURE_FLAGS: z.strictObject({
    TEST_FEATURE: z.boolean(),
  }),
})

type RemoteConfig = z.infer<typeof RemoteConfigSchema>

interface RemoteConfigContextType {
  remoteConfig: RemoteConfig
  setRemoteConfig: (remoteConfig: RemoteConfig) => void
  loading: boolean
}

interface RemoteConfigProviderProps extends PropsWithChildren {
  logger: RemoteLogger
}

const RemoteConfigContext = createContext<RemoteConfigContextType | null>(null)

export const RemoteConfigProvider = (props: RemoteConfigProviderProps) => {
  const [remoteConfig, setRemoteConfig] = useState<RemoteConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const result = RemoteConfigSchema.safeParse(remoteConfigJSON)

      if (!result.success && __DEV__) {
        throw new Error(`[RemoteConfig] remoteconfig.json is invalid: ${result.error.message}`)
      }

      if (result.success) {
        setRemoteConfig(result.data)
        setLoading(false)
      }
    }

    load()
  }, [props.logger])

  return (
    <RemoteConfigContext.Provider
      value={{
        remoteConfig: remoteConfig ?? (remoteConfigJSON as RemoteConfig),
        setRemoteConfig,
        loading,
      }}
    >
      {props.children}
    </RemoteConfigContext.Provider>
  )
}

export const useRemoteConfig = () => {
  const context = useContext(RemoteConfigContext)

  if (!context) {
    throw new Error('useRemoteConfig must be used within a RemoteConfigProvider')
  }

  return context
}

export const useFeatureFlags = () => {
  const { remoteConfig, setRemoteConfig } = useRemoteConfig()
  const FeatureFlags = remoteConfig.FEATURE_FLAGS

  const FeatureGates = useMemo(
    () => ({
      testFeatureEnabled() {
        return FeatureFlags.TEST_FEATURE && __DEV__
      },
    }),
    [FeatureFlags]
  )

  const getFeatureFlag = useCallback(
    <TFlag extends keyof RemoteConfig['FEATURE_FLAGS']>(flag: TFlag) => {
      return remoteConfig.FEATURE_FLAGS[flag]
    },
    [remoteConfig.FEATURE_FLAGS]
  )

  const setFeatureFlag = useCallback(
    <TFlag extends keyof RemoteConfig['FEATURE_FLAGS']>(flag: TFlag, value: boolean) => {
      setRemoteConfig({
        ...remoteConfig,
        FEATURE_FLAGS: {
          ...remoteConfig.FEATURE_FLAGS,
          [flag]: value,
        },
      })
    },
    [remoteConfig, setRemoteConfig]
  )

  return useMemo(
    () => ({
      FeatureFlags,
      FeatureGates,
      getFeatureFlag,
      setFeatureFlag,
    }),
    [FeatureFlags, FeatureGates, getFeatureFlag, setFeatureFlag]
  )
}

// export const useFeatureFlags = () => {
//   const remoteConfig = useRemoteConfig()
//
//   return remoteConfig.FEATURE_FLAGS
// }

// import { PersistentStorage } from '@bifold/core'
// import { RemoteLogger } from '@bifold/remote-logs'
// import z from 'zod'
// import remoteConfigProd from './remote-config-prod.json'
//
// let REMOTE_CONFIG_MEMORY_CACHE: RemoteConfig
// const REMOTE_CONFIG_CACHE_MS = 24 * 60 * 60 * 1000 // 24 hours
// const REMOTE_CONFIG_KEY = 'remoteConfig'
//
// export const RemoteConfigSchema = z.strictObject({
//   flags: z.strictObject({
//     'debug.testFeature': z.boolean(),
//   }),
// })
//
// export type RemoteConfig = z.infer<typeof RemoteConfigSchema>
// type CachedRemoteConfig = { remoteConfig: RemoteConfig; timestamp: number }
//
// // Parse the default remote config with the strict schema to ensure it is valid
// const result = RemoteConfigSchema.safeParse(remoteConfigProd)
//
// if (!result.success && __DEV__) {
//   throw new Error(`[RemoteConfig] remote-config.json is invalid: ${result.error.message}`)
// }
//
// REMOTE_CONFIG_MEMORY_CACHE = result.success ? result.data : remoteConfigProd
//
// // -----------------------------
// // PUBLIC API
// // -----------------------------
//
// /**
//  * Three storage layers for remote config:
//  *
//  * 1. Memory cache (fastest, but lost on app restart)
//  * 2. Persistent storage (slower, but survives app restarts)
//  * 3. Remote server (slowest, but always up-to-date)
//  */
//
// /**
//  * Init the remote config by fetching it from the server or using the cached version if available and valid.
//  * @returns The initialized remote config object.
//  */
// export async function initRemoteConfig(logger: RemoteLogger): Promise<RemoteConfig> {
//   const cachedConfig = await _getCachedRemoteConfig(REMOTE_CONFIG_CACHE_MS, logger)
//
//   if (cachedConfig) {
//     logger.info('[RemoteConfig] Using cached remote config.')
//     REMOTE_CONFIG_MEMORY_CACHE = cachedConfig
//     return REMOTE_CONFIG_MEMORY_CACHE
//   }
//
//   const remoteConfig = await _fetchRemoteConfig()
//
//   if (!remoteConfig) {
//     logger.info('[RemoteConfig] Using default remote config.')
//     return REMOTE_CONFIG_MEMORY_CACHE
//   }
//
//   // Store the remote config in persistent storage for future use
//   try {
//     await PersistentStorage.storeValueForKey<CachedRemoteConfig>(REMOTE_CONFIG_KEY, {
//       remoteConfig: remoteConfig,
//       timestamp: Date.now(),
//     })
//   } catch (error) {
//     logger.error('[RemoteConfig] Error storing remote config in persistent storage:', error as Error)
//   }
//
//   logger.info('[RemoteConfig] Fetched and cached new remote config.')
//   // Store the remote config in memory cache for immediate use
//   REMOTE_CONFIG_MEMORY_CACHE = remoteConfig
//   return REMOTE_CONFIG_MEMORY_CACHE
// }
//
// /**
//  * Get the current remote config from memory cache.
//  * If the remote config has not been initialized, it will return the default remote config.
//  * @returns The current remote config object.
//  */
// export function getRemoteConfig(): RemoteConfig {
//   return REMOTE_CONFIG_MEMORY_CACHE
// }
//
// // -----------------------------
// // HELPER FUNCTIONS
// // -----------------------------
//
// async function _fetchRemoteConfig(): Promise<RemoteConfig | null> {
//   // NOTE: This is a placeholder for the actual remote config fetch logic.
//   // parse the remote config here
//   return null
// }
//
// async function _getCachedRemoteConfig(cacheMs: number, logger: RemoteLogger): Promise<RemoteConfig | null> {
//   let cachedConfig: CachedRemoteConfig | undefined
//
//   try {
//     cachedConfig = await PersistentStorage.fetchValueForKey<CachedRemoteConfig>(REMOTE_CONFIG_KEY)
//   } catch (error) {
//     logger.error('[RemoteConfig] Error fetching cached remote config:', { error })
//     return null
//   }
//
//   if (!cachedConfig) {
//     logger.info('[RemoteConfig] No cached remote config found.')
//     return null
//   }
//
//   if (Date.now() - cachedConfig.timestamp > cacheMs) {
//     logger.info('[RemoteConfig] Cached remote config is expired.')
//     return null
//   }
//
//   // const result = RemoteConfigSchema.safeParse(cachedConfig.remoteConfig)
//   //
//   // if (!result.success) {
//   //   logger.info('[RemoteConfig] Cached remote config is invalid.', { error: result.error.message })
//   //   return null
//   // }
//
//   return cachedConfig.remoteConfig
// }
