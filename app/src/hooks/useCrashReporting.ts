import { useFeatureFlags } from '@/remote-config/FeatureFlags'
import { useRemoteConfig } from '@/remote-config/RemoteConfig'
import { setCrashReportingEnabled } from '@/services/crash-reporting'
import { BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useEffect } from 'react'

/**
 * Applies the crash reporting gate once remote config and the stored state have loaded, so the kill flag
 * and the selected environment are honoured.
 * Must be used within a RemoteConfigProvider.
 */
export const useCrashReporting = (): void => {
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [store] = useStore<BCState>()
  const { loading } = useRemoteConfig()
  const { featureGates } = useFeatureFlags()
  const enabled = featureGates.crashReportingEnabled()

  useEffect(() => {
    if (loading || !store.stateLoaded) {
      return
    }

    setCrashReportingEnabled(enabled).catch((error) => {
      logger.error('[CrashReporting] Failed to apply crash reporting setting', error as Error)
    })
  }, [enabled, loading, logger, store.stateLoaded])
}
