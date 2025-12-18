import { AnalyticsTracker } from './analytics-tracker'

const ANALYTICS_SINGLEAPP_NAMESPACE = 'singleapp_client'
const ANALYTICS_SINGLEAPP_ENDPOINT = __DEV__ ? 'localhost:9090' : '' // TODO (MD): Add production endpoint

declare global {
  // eslint-disable-next-line no-var
  var __ANALYTICS_TRACKER_SINGLETON__: AnalyticsTracker | undefined
}

// Hot-reload safe singleton instance of AnalyticsTracker
export const Analytics =
  globalThis.__ANALYTICS_TRACKER_SINGLETON__ ??
  (globalThis.__ANALYTICS_TRACKER_SINGLETON__ = new AnalyticsTracker(
    ANALYTICS_SINGLEAPP_NAMESPACE,
    ANALYTICS_SINGLEAPP_ENDPOINT,
  ))
