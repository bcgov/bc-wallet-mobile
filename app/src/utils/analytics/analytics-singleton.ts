import { ANALYTICS_SINGLEAPP_ENDPOINT, ANALYTICS_SINGLEAPP_NAMESPACE, AnalyticsTracker } from './analytics-tracker'

declare global {
  var __ANALYTICS_TRACKER_SINGLETON__: AnalyticsTracker | undefined
}

// Hot-reload safe singleton instance of AnalyticsTracker
export const Analytics =
  globalThis.__ANALYTICS_TRACKER_SINGLETON__ ??
  (globalThis.__ANALYTICS_TRACKER_SINGLETON__ = new AnalyticsTracker(
    ANALYTICS_SINGLEAPP_NAMESPACE,
    ANALYTICS_SINGLEAPP_ENDPOINT
  ))
