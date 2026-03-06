import { Platform } from 'react-native'
import Config from 'react-native-config'
import { AnalyticsTracker } from './analytics-tracker'

declare global {
  // eslint-disable-next-line no-var
  var __ANALYTICS_TRACKER_SINGLETON__: AnalyticsTracker | undefined
}

// NOTE: This allows the CI/CD pipeline to be plumbed together and Github variable added (Github doesn't allow empty strings for variables)
const FLAG_DISABLE_ANALYTICS = 'FLAG_DISABLE_ANALYTICS'

const getSnowplowEndpointUrl = (): string => {
  if (Config.SNOWPLOW_COLLECTOR_URL === FLAG_DISABLE_ANALYTICS) {
    return ''
  }

  if (!Config.SNOWPLOW_COLLECTOR_URL) {
    return ''
  }

  return Config.SNOWPLOW_COLLECTOR_URL
}

// Hot-reload safe singleton instance of AnalyticsTracker
export const Analytics =
  globalThis.__ANALYTICS_TRACKER_SINGLETON__ ??
  (globalThis.__ANALYTICS_TRACKER_SINGLETON__ = new AnalyticsTracker(
    Platform.OS === 'ios' ? 'iOS' : 'Android', // Note: Potentially case sensitive
    getSnowplowEndpointUrl()
  ))
