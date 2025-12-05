import { getTracker, newTracker, PlatformContextRetriever, removeTracker } from '@snowplow/react-native-tracker'
import { Dimensions, Platform } from 'react-native'
import {
  getBatteryLevel,
  getBuildNumber,
  getCarrier,
  getFreeDiskStorage,
  getManufacturer,
  getModel,
  getPowerState,
  getSystemVersion,
  getTotalDiskCapacity,
  getTotalMemory,
  getUsedMemory,
  getVersion,
  isLandscape,
  isLowBatteryLevel,
} from 'react-native-device-info'
import { AnalyticsTracker } from './analytics-tracker.interface'

const ANALYTICS_SINGLEAPP_NAMESPACE = 'singleapp'

export class Analytics {
  /**
   * Returns the analytics tracker instance
   *
   * @throws {Error} If the analytics tracker is not initialized
   * @returns {*} {AnalyticsTracker} The analytics tracker instance
   */
  static get tracker(): AnalyticsTracker {
    const tracker = getTracker(ANALYTICS_SINGLEAPP_NAMESPACE)

    if (!tracker) {
      throw new Error('Analytics tracker not initialized')
    }

    return {
      trackErrorEvent: (error: Error) => {
        tracker.trackSelfDescribingEvent({
          schema: 'iglu:com.example/error_event/jsonschema/1-0-0 TODO: (MD)',
          data: {
            message: error.message,
            name: error.name,
            stack: error.stack,
          },
        })
      },
      trackTimingEvent: tracker.trackTimingEvent,
      trackStructuredEvent: tracker.trackStructuredEvent,
      trackScreenViewEvent: tracker.trackScreenViewEvent,
      trackListItemViewEvent: tracker.trackListItemViewEvent,
      trackDeepLinkReceivedEvent: tracker.trackDeepLinkReceivedEvent,
      trackMessageNotificationEvent: tracker.trackMessageNotificationEvent,
    }
  }

  /**
   * Configures the analytics tracker
   *
   * @param {Object} config - Configuration object
   * @param {boolean} config.enableAnalytics - Whether to enable analytics tracking
   * @returns {*} {Promise<void>}
   */
  async configureTracker(config: { enableAnalytics: boolean }): Promise<void> {
    const existingTracker = getTracker(ANALYTICS_SINGLEAPP_NAMESPACE)

    if (existingTracker) {
      removeTracker(ANALYTICS_SINGLEAPP_NAMESPACE)
    }

    await newTracker({
      //userId
      //networkUserId
      //ipAddress
      namespace: ANALYTICS_SINGLEAPP_NAMESPACE,
      endpoint: 'collector.example.com',
      appId: 'TODO',
      appVersion: getVersion(),
      appBuild: getBuildNumber(),
      devicePlatform: 'mob',
      deepLinkContext: config.enableAnalytics,
      screenContext: config.enableAnalytics,
      lifecycleAutotracking: config.enableAnalytics,
      screenEngagementAutotracking: config.enableAnalytics,
      installAutotracking: true,
      useAsyncStorageForEventStore: true,
      timezone: 'America/Vancouver',
      language: 'en',
      platformContextRetriever: this.getPlatformContextRetriever(config.enableAnalytics),
    })
  }

  private getPlatformContextRetriever(enableAnalytics: boolean): PlatformContextRetriever | undefined {
    if (!enableAnalytics) {
      return
    }

    return {
      getOsType: async () => Platform.OS,
      getOsVersion: async () => getSystemVersion(),
      getDeviceModel: async () => getModel(),
      getDeviceManufacturer: getManufacturer,
      getCarrier: getCarrier,
      // getNetworkType?: () => Promise<'mobile' | 'wifi' | 'offline' | undefined>;
      // getNetworkTechnology?: () => Promise<string | undefined>;
      // getAppleIdfa?: () => Promise<string | undefined>;
      // getAppleIdfv?: () => Promise<string | undefined>;
      getAvailableStorage: getFreeDiskStorage,
      getTotalStorage: getTotalDiskCapacity,
      getPhysicalMemory: getTotalMemory,
      getAppAvailableMemory: async () => {
        const [totalMemory, usedMemory] = await Promise.all([getTotalMemory(), getUsedMemory()])
        return totalMemory - usedMemory
      },
      getBatteryLevel: getBatteryLevel,
      getBatteryState: async () => {
        const powerState = await getPowerState()
        if (powerState.batteryState === 'unknown') {
          return undefined
        }
        return powerState.batteryState
      },
      getLowPowerMode: async () => {
        const batteryLevel = await getBatteryLevel()
        return isLowBatteryLevel(batteryLevel)
      },
      isPortrait: async () => {
        const landscapeMode = await isLandscape()
        return !landscapeMode
      },
      getResolution: async () => {
        return `${Dimensions.get('window').width}x${Dimensions.get('window').height}`
      },
      // getScale?: () => Promise<number | undefined>;
      // getLanguage?: () => Promise<string | undefined>;
      // getAndroidIdfa?: () => Promise<string | undefined>;
      // getAppSetId?: () => Promise<string | undefined>;
      // getAppSetIdScope?: () => Promise<string | undefined>;
    }
  }
}

Analytics.tracker.trackErrorEvent(new Error('Analytics module loaded'))
