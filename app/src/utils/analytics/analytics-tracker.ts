import { AlertEvent, AlertInteractionEvent } from '@/events/alertEvents'
import { getTracker, newTracker, ReactNativeTracker, removeTracker } from '@snowplow/react-native-tracker'
import Config from 'react-native-config'
import { getBuildNumber, getBundleId, getIpAddress, getUniqueId, getVersion } from 'react-native-device-info'
import { getPlatformContextProperties, getPlatformContextRetriever } from './platform-context-retriever'

export const ANALYTICS_SINGLEAPP_NAMESPACE = 'singleapp_client'
export const ANALYTICS_SINGLEAPP_ENDPOINT = __DEV__ ? 'localhost:9090' : String(Config.SNOWPLOW_COLLECTOR_ENDPOINT)
export const ANALYTICS_MOBILE_ERROR_EVENT_SCHEMA = 'iglu:ca.bc.gov.idim/mobile_error/jsonschema/1-0-0'
export const ANALYTICS_MOBILE_ALERT_EVENT_SCHEMA = 'iglu:ca.bc.gov.idim/action/jsonschema/1-0-0'

const AnalyticsClient = {
  newTracker,
  getTracker,
  removeTracker,
}

type AnalyticsClient = typeof AnalyticsClient

interface AnalyticsError {
  code: string // TODO (MD): Use AlertEvent or ErrorEvent codes
  message: string
}

/**
 * AnalyticsTracker class to track analytics events.
 *
 * TODO (MD): Implement the `trackTimingEvent` method to track timing events.
 *
 * @see self hosted snowplow micro: https://docs.snowplow.io/docs/testing/snowplow-micro/basic-usage/
 *
 * @class
 * @example
 * const analyticsTracker = new AnalyticsTracker('myNamespace', 'https://endpoint.com')
 *
 * await analyticsTracker.initializeTracker()
 *
 * analyticsTracker.trackErrorEvent({code: 'NETWORK_ERROR', message: 'Failed to fetch data'})
 * analyticsTracker.trackScreenEvent('HomeScreen', 'LoginScreen')
 * analyticsTracker.trackAlertDisplayEvent(AlertEvent.SAMPLE_EVENT)
 * analyticsTracker.trackAlertActionEvent(AlertEvent.SAMPLE_EVENT, 'OK')
 */
export class AnalyticsTracker {
  private namespace: string
  private endpoint: string
  private client: AnalyticsClient
  private tracker?: ReactNativeTracker
  trackingEnabled: boolean

  constructor(namespace: string, endpoint: string, client = AnalyticsClient) {
    this.namespace = namespace
    this.endpoint = endpoint
    this.client = client
    this.trackingEnabled = false
  }

  /**
   * Checks if Analytics has an initialized tracker.
   *
   * @returns {*} {boolean}
   */
  hasTracker(): boolean {
    return Boolean(this.tracker)
  }

  /**
   * Initializes the analytics tracker with the provided options.
   *
   * @returns {*} {Promise<void>}
   */
  async initializeTracker(): Promise<void> {
    this.tracker = await this.client.newTracker({
      namespace: this.namespace,
      endpoint: this.endpoint,
      protocol: __DEV__ ? 'http' : 'https',
      eventMethod: 'post',
      appId: getBundleId(),
      appVersion: getVersion(),
      appBuild: getBuildNumber(),
      userId: getUniqueId(),
      ipAddress: await getIpAddress().catch(() => ''),
      devicePlatform: 'mob',
      deepLinkContext: false,
      screenContext: false, // Tracked manually via trackScreenEvent
      lifecycleAutotracking: this.trackingEnabled,
      screenEngagementAutotracking: false,
      installAutotracking: this.trackingEnabled,
      useAsyncStorageForEventStore: true,
      timezone: 'America/Vancouver',
      language: 'en',
      platformContext: this.trackingEnabled,
      platformContextProperties: getPlatformContextProperties(this.trackingEnabled),
      platformContextRetriever: getPlatformContextRetriever(this.trackingEnabled),
    })
  }

  /**
   * Tracks a screen view event.
   *
   * @param {string} screenName - The name of the current screen.
   * @param {string} [previousScreenName] - The name of the previous screen.
   * @returns {*} {void}
   */
  trackScreenEvent(screenName: string, previousScreenName?: string): void {
    if (!this.tracker) {
      return
    }

    // Avoid tracking if the screen name hasn't changed
    if (screenName === previousScreenName) {
      return
    }

    this.tracker.trackScreenViewEvent({
      name: screenName,
      previousName: previousScreenName,
    })
  }

  /**
   * Tracks an error event.
   *
   * Note: This uses the `idim` snowplow `mobile_error` schema.
   *
   * @param {AnalyticsError} error - The error to track.
   * @returns {*} {void}
   */
  trackErrorEvent(error: AnalyticsError): void {
    if (!this.tracker) {
      return
    }

    this.tracker.trackSelfDescribingEvent({
      schema: ANALYTICS_MOBILE_ERROR_EVENT_SCHEMA,
      data: {
        errorCode: error.code,
        body: error.message,
      },
    })
  }

  /**
   * Tracks an alert display event.
   *
   * Note: This uses the `idim` snowplow `action` schema.
   *
   * @param {AlertEvent} alertEvent - The alert event to track.
   * @returns {*} {void}
   */
  trackAlertDisplayEvent(alertEvent: AlertEvent): void {
    if (!this.tracker) {
      return
    }

    this.tracker.trackSelfDescribingEvent({
      schema: ANALYTICS_MOBILE_ALERT_EVENT_SCHEMA,
      data: {
        action: AlertInteractionEvent.ALERT_DISPLAY,
        text: alertEvent,
      },
    })
  }

  /**
   * Tracks an alert action event.
   *
   * Note: This uses the `idim` snowplow `action` schema.
   *
   * @param {AlertEvent} alertEvent - The alert event to track.
   * @param {string} actionLabel - The action label taken on the alert (e.g., 'ok' button pressed).
   * @returns {*} {void}
   */
  trackAlertActionEvent(alertEvent: AlertEvent, actionLabel: string): void {
    if (!this.tracker) {
      return
    }

    this.tracker.trackSelfDescribingEvent({
      schema: ANALYTICS_MOBILE_ALERT_EVENT_SCHEMA,
      data: {
        action: AlertInteractionEvent.ALERT_ACTION,
        text: alertEvent,
        message: actionLabel,
      },
    })
  }
}
