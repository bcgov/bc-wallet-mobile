import { ANALYTICS_SINGLEAPP_ENDPOINT, ANALYTICS_SINGLEAPP_NAMESPACE, AnalyticsTracker } from './analytics-tracker'

export {} // Ensure this file is treated as a module

declare global {
  // eslint-disable-next-line no-var
  var __ANALYTICS_TRACKER_SINGLETON__: AnalyticsTracker | undefined
}

// Hot-reload safe singleton instance of AnalyticsTracker
export const Analytics =
  globalThis.__ANALYTICS_TRACKER_SINGLETON__ ??
  (globalThis.__ANALYTICS_TRACKER_SINGLETON__ = new AnalyticsTracker(
    ANALYTICS_SINGLEAPP_NAMESPACE,
    ANALYTICS_SINGLEAPP_ENDPOINT
  ))
