import { getTracker, newTracker, ReactNativeTracker, removeTracker, TimingProps } from '@snowplow/react-native-tracker'
import { getBuildNumber, getBundleId, getIpAddress, getUniqueId, getVersion } from 'react-native-device-info'
import { BCError } from '../bc-error'
import { CreateTrackerOptions, CustomAnalyticsEvent } from './analytics-tracker.interface'
import { getPlatformContextProperties, getPlatformContextRetriever } from './platform-context-retriever'

export const ANALYTICS_SINGLEAPP_NAMESPACE = 'SINGLEAPP_CLIENT'
export const ANALYTICS_SINGLEAPP_ENDPOINT = 'localhost:9090'

/**
 * AnalyticsTracker class to manage analytics tracking.
 *
 * @see self hosted snowplow micro: https://docs.snowplow.io/docs/testing/snowplow-micro/basic-usage/
 *
 * @class
 * @example
 * const analyticsTracker = new AnalyticsTracker('myNamespace', 'https://endpoint.com')
 *
 * await analyticsTracker.initializeTracker({ enableAutomaticTracking: true })
 *
 * analyticsTracker.trackErrorEvent(new Error('Test error'))
 */
export class AnalyticsTracker {
  constructor(private namespace: string, private endpoint: string) {}

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
   * Checks if Analytics has an initialized tracker.
   *
   * @return {*} {boolean}
   */
  hasTracker(): boolean {
    return Boolean(getTracker(this.namespace))
  }

  /**
   * Initializes the analytics tracker with the provided options.
   *
   * @param {CreateTrackerOptions} options - Options for tracker initialization.
   * @returns {*} {Promise<void>}
   */
  async initializeTracker(options: CreateTrackerOptions): Promise<void> {
    const existingTracker = getTracker(this.namespace)

    if (existingTracker) {
      removeTracker(this.namespace)
    }

    await newTracker({
      namespace: this.namespace,
      endpoint: this.endpoint,
      appId: getBundleId(),
      appVersion: getVersion(),
      appBuild: getBuildNumber(),
      userId: getUniqueId(),
      ipAddress: await getIpAddress(),
      devicePlatform: 'mob',
      deepLinkContext: options.enableAutomaticTracking,
      screenContext: options.enableAutomaticTracking,
      lifecycleAutotracking: options.enableAutomaticTracking,
      screenEngagementAutotracking: options.enableAutomaticTracking,
      installAutotracking: true,
      useAsyncStorageForEventStore: true,
      timezone: 'America/Vancouver',
      language: 'en',
      platformContext: options.enableAutomaticTracking,
      platformContextProperties: getPlatformContextProperties(options.enableAutomaticTracking),
      platformContextRetriever: getPlatformContextRetriever(options.enableAutomaticTracking),
    })
  }

  /**
   * Tracks an error event.
   *
   * @param {Error} error - The error to be tracked.
   * @returns {*} {void}
   */
  trackErrorEvent(error: Error): void {
    const errorContext =
      error instanceof BCError
        ? [
            {
              schema: 'TODO (MD)',
              data: {
                id: error.id,
                code: error.code,
                description: error.description,
                cause: error.cause ?? null,
              },
            },
          ]
        : undefined

    this.tracker.trackSelfDescribingEvent(
      {
        schema: 'iglu:com.snowplowanalytics.snowplow/application_error/jsonschema/1-0-0',
        data: {
          programmingLanguage: 'JAVASCRIPT', // Typescript is not an option
          message: error.message,
          stackTrace: error.stack ?? null,
          exceptionName: error.name,
        },
      },
      errorContext
    )
  }

  trackCustomEvent(customEvent: CustomAnalyticsEvent): void {
    return this.tracker.trackStructuredEvent(customEvent)
  }

  trackTimingEvent(timingEvent: TimingProps): void {
    return this.tracker.trackTimingEvent(timingEvent)
  }
}

// const namespace = await AnalyticsTracker.initializeTracker({
//   namespace: ANALYTICS_SINGLEAPP_NAMESPACE,
//   endpoint: 'TODO',
//   enableAutomaticTracking: true,
// })

export const Analytics = new AnalyticsTracker(ANALYTICS_SINGLEAPP_NAMESPACE, ANALYTICS_SINGLEAPP_ENDPOINT)
