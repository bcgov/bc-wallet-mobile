import { ANALYTICS_SINGLEAPP_ENDPOINT, ANALYTICS_SINGLEAPP_NAMESPACE, AnalyticsTracker } from './analytics-tracker'

// Export a singleton instance of AnalyticsTracker for the single app
export const Analytics = new AnalyticsTracker(ANALYTICS_SINGLEAPP_NAMESPACE, ANALYTICS_SINGLEAPP_ENDPOINT)
