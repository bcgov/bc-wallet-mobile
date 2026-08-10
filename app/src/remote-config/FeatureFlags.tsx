import { useCallback, useMemo } from 'react'
import { getRemoteConfig, RemoteConfig, useRemoteConfig } from './RemoteConfigContext'

export type FeatureFlags = RemoteConfig['featureFlags']
export type FeatureFlag = keyof FeatureFlags
export type FeatureGates = ReturnType<typeof useFeatureFlags>['featureGates']

/**
 * Hook to access feature flags and feature gates. Must be used within a RemoteConfigProvider.
 * @returns An object containing the current feature flags, feature gates, and functions to get and set feature flags.
 */
export const useFeatureFlags = () => {
  const { remoteConfig, setRemoteConfig } = useRemoteConfig()

  const featureFlags = remoteConfig.featureFlags

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
   * Set the value of a feature flag for local testing purposes.
   * This will not persist the change to remote config or affect other users.
   * @param flag The feature flag to set.
   * @param value The value to set the feature flag to.
   * @returns void
   */
  const setFeatureFlag = useCallback(
    <TFlag extends FeatureFlag>(flag: TFlag, value: boolean) => {
      setRemoteConfig({
        ...remoteConfig,
        featureFlags: {
          ...remoteConfig.featureFlags,
          [flag]: value,
        },
      })
    },
    [remoteConfig, setRemoteConfig]
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
      setFeatureFlag,
    }),
    [featureFlags, featureGates, getFeatureFlag, setFeatureFlag]
  )
}

/**
 * Get the value of a feature flag from the current remote config.
 * @param flag The feature flag to get.
 * @returns True if the feature flag is enabled, false otherwise.
 */
export function getFeatureFlag<TFlag extends FeatureFlag>(flag: TFlag): boolean {
  const remoteConfig = getRemoteConfig()
  return remoteConfig.featureFlags[flag]
}
