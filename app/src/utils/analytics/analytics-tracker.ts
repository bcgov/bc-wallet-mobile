import { getTracker, newTracker, ReactNativeTracker, removeTracker, TimingProps } from '@snowplow/react-native-tracker'
import { getBuildNumber, getBundleId, getIpAddress, getUniqueId, getVersion } from 'react-native-device-info'
import { AlertEvent, BCErrorCode } from '../error/bc-error-code'
import { getPlatformContextProperties, getPlatformContextRetriever } from './platform-context-retriever'

export const ANALYTICS_SINGLEAPP_NAMESPACE = 'singleapp_client'
// export const ANALYTICS_SINGLEAPP_ENDPOINT = 'http://10.0.0.61:9090'
export const ANALYTICS_SINGLEAPP_ENDPOINT = 'localhost:9090'
export const ANALYTICS_MOBILE_ERROR_EVENT_SCHEMA = 'iglu:ca.bc.gov.idim/mobile_error/jsonschema/1-0-0'
export const ANALYTICS_MOBILE_ALERT_EVENT_SCHEMA = 'iglu:ca.bc.gov.idim/action/jsonschema/1-0-0'

export interface CreateTrackerOptions {
  enableAutomaticTracking: boolean
}

/**
 * AnalyticsTracker class to track analytics events.
 *
 * @see self hosted snowplow micro: https://docs.snowplow.io/docs/testing/snowplow-micro/basic-usage/
 *
 * @class
 * @example
 * const analyticsTracker = new AnalyticsTracker('myNamespace', 'https://endpoint.com')
 *
 * await analyticsTracker.initializeTracker({ enableAutomaticTracking: true })
 *
 * analyticsTracker.startTracking()
 *
 * analyticsTracker.trackErrorEvent(new Error('Test error'))
 */
export class AnalyticsTracker {
  private namespace: string
  private endpoint: string
  private trackingEnabled: boolean

  constructor(namespace: string, endpoint: string) {
    this.namespace = namespace
    this.endpoint = endpoint
    this.trackingEnabled = false
  }

  /**
   * Retrieves the tracker instance for the specified namespace.
   *
   * @returns {*} {ReactNativeTracker} The tracker instance.
   */
  private get tracker(): ReactNativeTracker {
    const tracker = getTracker(this.namespace)

    if (!tracker) {
      throw new Error(`Tracker with namespace '${this.namespace}' does not exist`)
    }

    return tracker
  }

  /**
   * Enables analytics tracking.
   *
   * @returns {*} {void}
   */
  enableTracking(): void {
    this.trackingEnabled = true
  }

  /**
   * Stops analytics tracking.
   *
   * @returns {*} {void}
   */
  disableTracking(): void {
    this.trackingEnabled = false
  }

  /**
   * Checks if Analytics has an initialized tracker.
   *
   * @returns {*} {boolean}
   */
  hasTracker(): boolean {
    return Boolean(getTracker(this.namespace))
  }

  /**
   * Initializes the analytics tracker with the provided options.
   *
   * @returns {*} {Promise<void>}
   */
  async initializeTracker(): Promise<void> {
    const existingTracker = getTracker(this.namespace)

    if (existingTracker) {
      removeTracker(this.namespace)
    }

    await newTracker({
      namespace: this.namespace,
      endpoint: this.endpoint,
      protocol: 'http',
      eventMethod: 'post',
      postPath: 'tp2',
      appId: getBundleId(),
      appVersion: getVersion(),
      appBuild: getBuildNumber(),
      userId: getUniqueId(),
      ipAddress: await getIpAddress(),
      devicePlatform: 'mob',
      deepLinkContext: false,
      screenContext: false,
      lifecycleAutotracking: this.trackingEnabled,
      screenEngagementAutotracking: false,
      installAutotracking: true,
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
    if (!this.trackingEnabled) {
      return
    }

    console.log(`Tracking screen view: ${screenName}, previous: ${previousScreenName}`)

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
   * @param {BCErrorCode} errorCode - The error code.
   * @param {string} errorMessage - The error message.
   * @returns {*} {void}
   */
  trackErrorEvent(errorCode: BCErrorCode, errorMessage: string): void {
    if (!this.trackingEnabled) {
      return
    }

    this.tracker.trackSelfDescribingEvent({
      schema: ANALYTICS_MOBILE_ERROR_EVENT_SCHEMA,
      data: {
        errorCode: errorCode,
        body: errorMessage,
      },
    })
  }

  /**
   * Tracks an alert event.
   *
   * @param {AlertEvent} alertEvent - The alert event.
   * @param {string} alertName - The name of the alert.
   * @param {string} [alertAction] - The action associated with the alert.
   * @returns {*} {void}
   */
  trackAlertEvent(alertEvent: AlertEvent, alertName: string, alertAction?: string): void {
    if (!this.trackingEnabled) {
      return
    }

    this.tracker.trackSelfDescribingEvent({
      schema: ANALYTICS_MOBILE_ALERT_EVENT_SCHEMA,
      data: {
        action: alertEvent,
        text: alertName,
        message: alertAction,
      },
    })
  }

  /**
   * Tracks a timing event.
   *
   * @param {TimingProps} timingEvent - The timing event properties.
   * @returns {*} {void}
   */
  trackTimingEvent(timingEvent: TimingProps): void {
    if (!this.trackingEnabled) {
      return
    }

    return this.tracker.trackTimingEvent(timingEvent)
  }
}

// Export a singleton instance of AnalyticsTracker for the single app
export const Analytics = new AnalyticsTracker(ANALYTICS_SINGLEAPP_NAMESPACE, ANALYTICS_SINGLEAPP_ENDPOINT)
