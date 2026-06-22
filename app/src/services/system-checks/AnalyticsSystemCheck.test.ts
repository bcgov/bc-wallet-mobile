import { AnalyticsSystemCheck } from '@/services/system-checks/AnalyticsSystemCheck'
import { AnalyticsTracker } from '@/utils/analytics/analytics-tracker'
import { MockLogger } from '@bifold/core'

const makeTracker = (overrides: Partial<AnalyticsTracker> = {}): AnalyticsTracker =>
  ({
    hasTracker: jest.fn().mockReturnValue(false),
    initializeTracker: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }) as unknown as AnalyticsTracker

describe('AnalyticsSystemCheck', () => {
  describe('runCheck', () => {
    it('should return true when analytics is disabled, regardless of tracker state', () => {
      const tracker = makeTracker({ hasTracker: jest.fn().mockReturnValue(false) })
      const check = new AnalyticsSystemCheck(false, 'app-id', tracker, new MockLogger())

      expect(check.runCheck()).toBe(true)
      expect(tracker.hasTracker).not.toHaveBeenCalled()
    })

    it('should return true when analytics is enabled and tracker is initialized', () => {
      const tracker = makeTracker({ hasTracker: jest.fn().mockReturnValue(true) })
      const check = new AnalyticsSystemCheck(true, 'app-id', tracker, new MockLogger())

      expect(check.runCheck()).toBe(true)
    })

    it('should return false when analytics is enabled and tracker is not initialized', () => {
      const tracker = makeTracker({ hasTracker: jest.fn().mockReturnValue(false) })
      const check = new AnalyticsSystemCheck(true, 'app-id', tracker, new MockLogger())

      expect(check.runCheck()).toBe(false)
    })
  })

  describe('onFail', () => {
    it('should initialize the tracker with the provided app ID', async () => {
      const tracker = makeTracker()
      const check = new AnalyticsSystemCheck(true, 'my-app-id', tracker, new MockLogger())

      await check.onFail()

      expect(tracker.initializeTracker).toHaveBeenCalledWith('my-app-id')
    })

    it('should log an error if initializeTracker throws', async () => {
      const error = new Error('init failed')
      const tracker = makeTracker({ initializeTracker: jest.fn().mockRejectedValue(error) })
      const logger = new MockLogger()
      jest.spyOn(logger, 'error')
      const check = new AnalyticsSystemCheck(true, 'app-id', tracker, logger)

      await check.onFail()

      expect(logger.error).toHaveBeenCalledWith('Failed to initialize analytics tracker', expect.any(Object), error)
    })
  })
})
