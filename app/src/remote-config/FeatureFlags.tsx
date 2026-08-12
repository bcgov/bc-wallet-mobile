import { useCallback, useMemo } from 'react'
import { getRemoteConfig, useRemoteConfig } from './RemoteConfig'
import { RemoteConfig } from './remote-config-utils'

export type FeatureFlags = RemoteConfig['featureFlags']
export type FeatureFlag = keyof FeatureFlags
export type FeatureGates = ReturnType<typeof useFeatureFlags>['featureGates']

/**
 * Hook to access feature flags and feature gates. Must be used within a RemoteConfigProvider.
 * @returns An object containing the current feature flags, feature gates, and functions to get and set feature flags.
 */
export const useFeatureFlags = () => {
  const remoteConfig = useRemoteConfig()
  const featureFlags = remoteConfig.getValue('featureFlags')

  /**
   * Get the value of a feature flag.
   * @param flag The feature flag to get.
   * @returns True if the feature flag is enabled, false otherwise.
   */
  const getFeatureFlag = useCallback(
    <TFlag extends FeatureFlag>(flag: TFlag): boolean => {
      return featureFlags[flag]
    },
    [featureFlags]
  )

  /**
   * Feature gates are functions that determine whether a feature is enabled based on the current feature flags and other conditions.
   */
  const featureGates = useMemo(
    () => ({
      /**
       * Test feature gate for feature flag development purposes.
       * @returns True if the test feature is enabled and the app is in development mode, false otherwise.
       * */
      testFeatureEnabled() {
        return getFeatureFlag('debug.testFeature') && __DEV__
      },
    }),
    [getFeatureFlag]
  )

  return useMemo(
    () => ({
      featureFlags,
      featureGates,
      getFeatureFlag,
    }),
    [featureFlags, featureGates, getFeatureFlag]
  )
}

/**
 * Get the value of a feature flag from the memory cache.
 * @param flag The feature flag to get.
 * @returns True if the feature flag is enabled, false otherwise.
 */
export function getFeatureFlag<TFlag extends FeatureFlag>(flag: TFlag): boolean {
  const remoteConfig = getRemoteConfig()
  return remoteConfig.featureFlags[flag]
}
