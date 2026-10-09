import { BCState } from '@/store'
import { getInitialEnvironment, IASEnvironment } from '@/utils/environment'
import { useStore } from '@bifold/core'
import { useCallback, useMemo } from 'react'
import { getRemoteConfig, useRemoteConfig } from './RemoteConfig'
import { RemoteConfig } from './remote-config-utils'

export type FeatureFlags = RemoteConfig['featureFlags']
export type FeatureFlag = keyof FeatureFlags
export type FeatureGates = ReturnType<typeof useFeatureFlags>['featureGates']

/**
 * Hook to access feature flags and feature gates. Must be used within a RemoteConfigProvider.
 * @returns An object containing the current feature flags, feature gates, and functions to get feature flags.
 */
export const useFeatureFlags = () => {
  const remoteConfig = useRemoteConfig()
  const [store] = useStore<BCState>()
  const featureFlags = remoteConfig.getValue('featureFlags')
  const apiBaseUrl = store.developer.environment.iasApiBaseUrl

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
      /**
       * Crash reporting gate. Prod builds, and any build switched to prod, stay off until consent lands,
       * and the kill flag turns it off remotely.
       * @returns True if this build may send crash reports, false otherwise.
       */
      crashReportingEnabled() {
        // By API URL: the stored environment is a copy, and older builds stored it under other names
        return (
          getInitialEnvironment() !== IASEnvironment.PROD &&
          apiBaseUrl !== IASEnvironment.PROD.iasApiBaseUrl &&
          !getFeatureFlag('kill.crashlytics')
        )
      },
    }),
    [apiBaseUrl, getFeatureFlag]
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
