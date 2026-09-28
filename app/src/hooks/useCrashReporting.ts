import { useFeatureFlags } from '@/remote-config/FeatureFlags'
import { useRemoteConfig } from '@/remote-config/RemoteConfig'
import { setCrashReportingEnabled } from '@/services/crash-reporting'
import { TOKENS, useServices } from '@bifold/core'
import { useEffect } from 'react'

/**
 * Applies the crash reporting gate once remote config has loaded, so the kill flag is honoured.
 * Must be used within a RemoteConfigProvider.
 */
export const useCrashReporting = (): void => {
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { loading } = useRemoteConfig()
  const { featureGates } = useFeatureFlags()
  const enabled = featureGates.crashReportingEnabled()

  useEffect(() => {
    if (loading) {
      return
    }

    setCrashReportingEnabled(enabled).catch((error) => {
      logger.error('[CrashReporting] Failed to apply crash reporting setting', error as Error)
    })
  }, [enabled, loading, logger])
}
