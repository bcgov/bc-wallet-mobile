import Config from 'react-native-config'
import { AnalyticsTracker } from './analytics-tracker'

declare global {
  // eslint-disable-next-line no-var
  var __ANALYTICS_TRACKER_SINGLETON__: AnalyticsTracker | undefined
}

// Hot-reload safe singleton instance of AnalyticsTracker
export const Analytics =
  globalThis.__ANALYTICS_TRACKER_SINGLETON__ ??
  (globalThis.__ANALYTICS_TRACKER_SINGLETON__ = new AnalyticsTracker(Config.SNOWPLOW_COLLECTOR_URL ?? ''))
