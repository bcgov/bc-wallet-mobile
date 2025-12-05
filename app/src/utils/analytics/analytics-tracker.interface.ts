export interface CreateTrackerOptions {
  // namespace: string
  // endpoint: string
  enableAutomaticTracking: boolean
}

// Structured event categories for `trackStructuredEvent`
export enum CustomAnalyticsCategory {
  MEDIA = 'media',
}

export enum CustomAnalyticsAction {
  CAPTURE_PHOTO = 'capture_photo',
  RECORD_VIDEO = 'record_video',
}

export interface CustomAnalyticsEvent {
  category: CustomAnalyticsCategory
  action: CustomAnalyticsAction
  label?: string
  property?: string
  value?: number
}
