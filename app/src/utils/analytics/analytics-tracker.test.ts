import { AlertInteractionEvent, AppEventCode } from '@/events/appEventCode'
import { AnalyticsTracker } from '@/utils/analytics/analytics-tracker'
import { removeTracker } from '@snowplow/react-native-tracker'

jest.mock('@snowplow/react-native-tracker', () => ({
  ...jest.requireActual('@snowplow/react-native-tracker'),
  removeTracker: jest.fn(),
}))

/**
 * The spies are wired into the client's `newTracker` result, so a test that never calls
 * `initializeTracker` still fails loudly if a `!this.tracker` guard is removed — the
 * production call would throw rather than silently no-op.
 */
const createSubject = () => {
  const tracker = {
    setAppId: jest.fn(),
    trackScreenViewEvent: jest.fn(),
    trackSelfDescribingEvent: jest.fn(),
  }
  const newTracker = jest.fn().mockResolvedValue(tracker)
  const analytics = new AnalyticsTracker('namespace', 'endpoint', { newTracker } as never)

  return { analytics, tracker, newTracker }
}

describe('Analytics Tracker', () => {
  describe('initializeTracker', () => {
    it('should initialize tracker', async () => {
      const { analytics, newTracker } = createSubject()

      await analytics.initializeTracker('testAppId')

      expect(newTracker).toHaveBeenCalledTimes(1)
      expect(newTracker).toHaveBeenCalledWith(expect.objectContaining({ namespace: 'namespace', appId: 'testAppId' }))
    })
  })

  describe('hasTracker', () => {
    it('should return true if tracker exists', async () => {
      const { analytics } = createSubject()

      await analytics.initializeTracker('testAppId')

      expect(analytics.hasTracker()).toBe(true)
    })

    it('should return false if tracker is not initialized', () => {
      const { analytics } = createSubject()

      expect(analytics.hasTracker()).toBe(false)
    })
  })

  describe('stopTracking', () => {
    it('should remove the tracker', async () => {
      const { analytics } = createSubject()

      await analytics.initializeTracker('testAppId')

      analytics.stopTracking()

      expect(removeTracker).toHaveBeenCalledWith('namespace')
      expect(analytics.hasTracker()).toBe(false)
    })
  })

  describe('setAppId', () => {
    it('should set app ID when tracker exists', async () => {
      const { analytics, tracker } = createSubject()

      await analytics.initializeTracker('testAppId')

      analytics.setAppId('newAppId')

      expect(tracker.setAppId).toHaveBeenCalledWith('newAppId')
    })

    it('should not set app ID when tracker does not exist', () => {
      const { analytics, tracker } = createSubject()

      analytics.setAppId('newAppId')

      expect(tracker.setAppId).not.toHaveBeenCalled()
    })
  })

  describe('trackScreenEvent', () => {
    it('should not track when missing tracker', () => {
      const { analytics, tracker } = createSubject()

      analytics.trackScreenEvent('HomeScreen')

      expect(tracker.trackScreenViewEvent).not.toHaveBeenCalled()
    })

    it('should not track when screen name === previous screen name', async () => {
      const { analytics, tracker } = createSubject()

      await analytics.initializeTracker('testAppId')

      analytics.trackScreenEvent('HomeScreen', 'HomeScreen')

      expect(tracker.trackScreenViewEvent).not.toHaveBeenCalled()
    })

    it('should track when tracking enabled and valid screen names', async () => {
      const { analytics, tracker } = createSubject()

      await analytics.initializeTracker('testAppId')

      analytics.trackScreenEvent('HomeScreen', 'NewScreen')

      expect(tracker.trackScreenViewEvent).toHaveBeenCalledWith({
        name: 'HomeScreen',
        previousName: 'NewScreen',
      })
    })
  })

  describe('trackErrorEvent', () => {
    it('should not track when missing tracker', () => {
      const { analytics, tracker } = createSubject()

      analytics.trackErrorEvent({ code: 'test', message: 'Test error' })

      expect(tracker.trackSelfDescribingEvent).not.toHaveBeenCalled()
    })

    it('should track when tracking enabled and valid error', async () => {
      const { analytics, tracker } = createSubject()

      await analytics.initializeTracker('testAppId')

      analytics.trackErrorEvent({ code: 'test', message: 'Test error' })

      expect(tracker.trackSelfDescribingEvent).toHaveBeenCalledWith({
        schema: 'iglu:ca.bc.gov.idim/mobile_error/jsonschema/1-0-0',
        data: {
          errorCode: 'test',
          body: 'Test error',
        },
      })
    })
  })

  describe('trackAlertDisplayEvent', () => {
    it('should not track when missing tracker', () => {
      const { analytics, tracker } = createSubject()

      analytics.trackAlertDisplayEvent(AppEventCode.ADD_CARD_CAMERA_BROKEN)

      expect(tracker.trackSelfDescribingEvent).not.toHaveBeenCalled()
    })

    it('should track when tracking enabled and valid app event', async () => {
      const { analytics, tracker } = createSubject()

      await analytics.initializeTracker('testAppId')

      analytics.trackAlertDisplayEvent(AppEventCode.ADD_CARD_CAMERA_BROKEN)

      expect(tracker.trackSelfDescribingEvent).toHaveBeenCalledWith({
        schema: 'iglu:ca.bc.gov.idim/action/jsonschema/1-0-0',
        data: {
          action: AlertInteractionEvent.ALERT_DISPLAY,
          text: AppEventCode.ADD_CARD_CAMERA_BROKEN,
        },
      })
    })
  })

  describe('trackAlertActionEvent', () => {
    it('should not track when missing tracker', () => {
      const { analytics, tracker } = createSubject()

      analytics.trackAlertActionEvent(AppEventCode.ADD_CARD_CAMERA_BROKEN, 'ok')

      expect(tracker.trackSelfDescribingEvent).not.toHaveBeenCalled()
    })

    it('should track when tracking enabled and valid app event', async () => {
      const { analytics, tracker } = createSubject()

      await analytics.initializeTracker('testAppId')

      analytics.trackAlertActionEvent(AppEventCode.ADD_CARD_CAMERA_BROKEN, 'ok')

      expect(tracker.trackSelfDescribingEvent).toHaveBeenCalledWith({
        schema: 'iglu:ca.bc.gov.idim/action/jsonschema/1-0-0',
        data: {
          action: AlertInteractionEvent.ALERT_ACTION,
          text: AppEventCode.ADD_CARD_CAMERA_BROKEN,
          message: 'ok',
        },
      })
    })
  })
})
