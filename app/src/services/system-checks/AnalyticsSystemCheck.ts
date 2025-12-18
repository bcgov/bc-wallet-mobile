import { AnalyticsTracker } from '@/utils/analytics/analytics-tracker'
import { BifoldLogger } from '@bifold/core'
import { SystemCheckStrategy } from './system-checks'

/**
 * System check to ensure analytics tracker is initialized.
 */
export class AnalyticsSystemCheck implements SystemCheckStrategy {
  private readonly analyticsEnabled: boolean
  private readonly analyticsTracker: AnalyticsTracker
  private readonly logger: BifoldLogger

  constructor(analyticsEnabled: boolean, analyticsTracker: AnalyticsTracker, logger: BifoldLogger) {
    this.analyticsEnabled = analyticsEnabled
    this.analyticsTracker = analyticsTracker
    this.logger = logger
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

    try {
      await this.analyticsTracker.initializeTracker()
    } catch (error) {
      this.logger.error(
        'Failed to initialize analytics tracker',
        {
          file: 'AnalyticsSystemCheck.ts',
        },
        error as Error,
      )
    }
  }
}
