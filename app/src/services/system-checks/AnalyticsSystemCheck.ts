import { AnalyticsTracker } from '@/utils/analytics/analytics-tracker'
import { SystemCheckStrategy } from './system-checks'

/**
 * System check to ensure analytics tracker is initialized.
 */
export class AnalyticsSystemCheck implements SystemCheckStrategy {
  private analyticsEnabled: boolean
  private analyticsTracker: AnalyticsTracker

  constructor(analyticsEnabled: boolean, analyticsTracker: AnalyticsTracker) {
    this.analyticsEnabled = analyticsEnabled
    this.analyticsTracker = analyticsTracker
  }

  /**
   * Runs the analytics system check to verify if the analytics tracker is initialized.
   *
   * @returns {*} {boolean} - True if the analytics tracker is initialized, false otherwise.
   */
  runCheck(): boolean {
    return this.analyticsTracker.hasTracker()
  }

  /**
   * Handles the failure of the analytics system check by initializing the analytics tracker.
   *
   * @return {*} {Promise<void>}
   */
  async onFail() {
    if (!this.analyticsEnabled) {
      return
    }

    await this.analyticsTracker.initializeTracker()
  }
}
