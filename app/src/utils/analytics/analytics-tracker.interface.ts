import { ReactNativeTracker } from '@snowplow/react-native-tracker'

export type AnalyticsTracker = Pick<
  ReactNativeTracker,
  | 'trackTimingEvent'
  | 'trackStructuredEvent'
  | 'trackScreenViewEvent'
  | 'trackListItemViewEvent'
  | 'trackDeepLinkReceivedEvent'
  | 'trackMessageNotificationEvent'
> & {
  trackErrorEvent: (error: Error) => void
}

export interface ConfigureAnalyticsTrackerParams {
  enableAnalytics: boolean
}

// Structured event categories for `trackStructuredEvent`
export enum AnalyticsEventCategory {
  MEDIA = 'media',
}

export const AnalyticsStructuredEvent = {
  CAPTURE_PHOTO: {
    category: AnalyticsEventCategory.MEDIA,
    action: 'capture_photo',
  },
  RECORD_VIDEO: {
    category: AnalyticsEventCategory.MEDIA,
    action: 'record_video',
  },
} as const
