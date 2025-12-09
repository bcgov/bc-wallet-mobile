import { AlertEvent, AlertInteractionEvent } from '@/events/alertEvents'
import {
  ANALYTICS_MOBILE_ALERT_EVENT_SCHEMA,
  ANALYTICS_MOBILE_ERROR_EVENT_SCHEMA,
  AnalyticsTracker,
} from '@/utils/analytics/analytics-tracker'

describe('Analytics Tracker', () => {
  it('should contstruct properly', () => {
    const analytics = new AnalyticsTracker('namespace', 'endpoint')

    expect(analytics).toBeInstanceOf(AnalyticsTracker)
  })

  describe('initializeTracker', () => {
    it('should remove existing tracker before initializing a new one', async () => {
      const mockNewTracker = jest.fn()
      const mockRemoveTracker = jest.fn()
      const mockAnalyticsClient = {
        newTracker: mockNewTracker,
        getTracker: jest.fn(),
        removeTracker: mockRemoveTracker,
      }

      const analytics = new AnalyticsTracker('namespace', 'endpoint', mockAnalyticsClient)

      // First initialization
      await analytics.initializeTracker({ startTracking: true })
      expect(mockRemoveTracker).not.toHaveBeenCalled()
      expect(mockNewTracker).toHaveBeenCalledTimes(1)

      mockAnalyticsClient.getTracker = jest.fn().mockReturnValue({})

      // Second initialization
      await analytics.initializeTracker({ startTracking: true })
      expect(mockRemoveTracker).toHaveBeenCalledWith('namespace')
      expect(mockNewTracker).toHaveBeenCalledTimes(2)
    })
  })

  describe('hasTracker', () => {
    it('should return true if tracker exists', async () => {
      const mockAnalyticsClient = {
        newTracker: jest.fn(),
        getTracker: jest.fn().mockReturnValue({}),
        removeTracker: jest.fn(),
      }

      const analytics = new AnalyticsTracker('namespace', 'endpoint', mockAnalyticsClient)

      expect(analytics.hasTracker()).toBe(true)
    })

    it('should return false if tracker is not initialized', () => {
      const analytics = new AnalyticsTracker('namespace', 'endpoint')

      expect(analytics.hasTracker()).toBe(false)
    })

    it('should return false if tracking not enabled', async () => {
      const mockAnalyticsClient = {
        newTracker: jest.fn(),
        getTracker: jest.fn().mockReturnValue(undefined),
        removeTracker: jest.fn(),
      }

      const analytics = new AnalyticsTracker('namespace', 'endpoint', mockAnalyticsClient)

      expect(analytics.hasTracker()).toBe(false)
    })
  })

  describe('trackScreenEvent', () => {
    it('should not track when missing tracker', async () => {
      const mockTrackScreenView = jest.fn()
      const mockAnalyticsClient = {
        newTracker: jest.fn(),
        getTracker: jest.fn(),
        removeTracker: jest.fn(),
      }

      const analytics = new AnalyticsTracker('namespace', 'endpoint', mockAnalyticsClient)
      analytics.trackingEnabled = true

      analytics.trackScreenEvent('HomeScreen')

      expect(mockTrackScreenView).not.toHaveBeenCalled()
    })

    it('should not track when tracking disabled', async () => {
      const mockTrackScreenView = jest.fn()
      const mockAnalyticsClient = {
        newTracker: jest.fn(),
        getTracker: jest.fn().mockReturnValue({
          trackScreenViewEvent: mockTrackScreenView,
        }),
        removeTracker: jest.fn(),
      }

      const analytics = new AnalyticsTracker('namespace', 'endpoint', mockAnalyticsClient)
      analytics.trackingEnabled = false

      analytics.trackScreenEvent('HomeScreen')

      expect(mockTrackScreenView).not.toHaveBeenCalled()
    })

    it('should not track when screen name === previous screen name', async () => {
      const mockTrackScreenView = jest.fn()
      const mockAnalyticsClient = {
        newTracker: jest.fn(),
        getTracker: jest.fn().mockReturnValue({
          trackScreenViewEvent: mockTrackScreenView,
        }),
        removeTracker: jest.fn(),
      }

      const analytics = new AnalyticsTracker('namespace', 'endpoint', mockAnalyticsClient)
      analytics.trackingEnabled = true

      analytics.trackScreenEvent('HomeScreen', 'HomeScreen')

      expect(mockTrackScreenView).not.toHaveBeenCalled()
    })

    it('should track when tracking enabled and valid screen names', async () => {
      const mockTrackScreenView = jest.fn()
      const mockAnalyticsClient = {
        newTracker: jest.fn(),
        getTracker: jest.fn().mockReturnValue({
          trackScreenViewEvent: mockTrackScreenView,
        }),
        removeTracker: jest.fn(),
      }

      const analytics = new AnalyticsTracker('namespace', 'endpoint', mockAnalyticsClient)
      analytics.trackingEnabled = true

      analytics.trackScreenEvent('HomeScreen', 'NewScreen')

      expect(mockTrackScreenView).toHaveBeenCalledWith({
        name: 'HomeScreen',
        previousName: 'NewScreen',
      })
    })
  })

  describe('trackErrorEvent', () => {
    it('should not track when missing tracker', async () => {
      const mockTrackError = jest.fn()
      const mockAnalyticsClient = {
        newTracker: jest.fn(),
        getTracker: jest.fn(),
        removeTracker: jest.fn(),
      }

      const analytics = new AnalyticsTracker('namespace', 'endpoint', mockAnalyticsClient)
      analytics.trackingEnabled = true

      analytics.trackErrorEvent({ code: 'test', message: 'Test error' })

      expect(mockTrackError).not.toHaveBeenCalled()
    })

    it('should not track when tracking disabled', async () => {
      const mockTrackError = jest.fn()
      const mockAnalyticsClient = {
        newTracker: jest.fn(),
        getTracker: jest.fn().mockReturnValue({
          trackSelfDescribingEvent: mockTrackError,
        }),
        removeTracker: jest.fn(),
      }

      const analytics = new AnalyticsTracker('namespace', 'endpoint', mockAnalyticsClient)
      analytics.trackingEnabled = false

      analytics.trackErrorEvent({ code: 'test', message: 'Test error' })

      expect(mockTrackError).not.toHaveBeenCalled()
    })

    it('should track when tracking enabled and valid error', async () => {
      const mockTrackError = jest.fn()
      const mockAnalyticsClient = {
        newTracker: jest.fn(),
        getTracker: jest.fn().mockReturnValue({
          trackSelfDescribingEvent: mockTrackError,
        }),
        removeTracker: jest.fn(),
      }

      const analytics = new AnalyticsTracker('namespace', 'endpoint', mockAnalyticsClient)
      analytics.trackingEnabled = true

      analytics.trackErrorEvent({ code: 'test', message: 'Test error' })

      expect(mockTrackError).toHaveBeenCalledWith({
        schema: ANALYTICS_MOBILE_ERROR_EVENT_SCHEMA,
        data: {
          errorCode: 'test',
          body: 'Test error',
        },
      })
    })

    describe('trackAlertDisplayEvent', () => {
      it('should not track when missing tracker', async () => {
        const mockTrackAlert = jest.fn()
        const mockAnalyticsClient = {
          newTracker: jest.fn(),
          getTracker: jest.fn(),
          removeTracker: jest.fn(),
        }

        const analytics = new AnalyticsTracker('namespace', 'endpoint', mockAnalyticsClient)
        analytics.trackingEnabled = true

        analytics.trackAlertDisplayEvent(AlertEvent.ADD_CARD_CAMERA_BROKEN)

        expect(mockTrackAlert).not.toHaveBeenCalled()
      })
      it('should not track when tracking disabled', async () => {
        const mockTrackAlert = jest.fn()
        const mockAnalyticsClient = {
          newTracker: jest.fn(),
          getTracker: jest.fn().mockReturnValue({
            trackSelfDescribingEvent: mockTrackAlert,
          }),
          removeTracker: jest.fn(),
        }

        const analytics = new AnalyticsTracker('namespace', 'endpoint', mockAnalyticsClient)
        analytics.trackingEnabled = false

        analytics.trackAlertDisplayEvent(AlertEvent.ADD_CARD_CAMERA_BROKEN)

        expect(mockTrackAlert).not.toHaveBeenCalled()
      })

      it('should track when tracking enabled and valid alert event', async () => {
        const mockTrackAlert = jest.fn()
        const mockAnalyticsClient = {
          newTracker: jest.fn(),
          getTracker: jest.fn().mockReturnValue({
            trackSelfDescribingEvent: mockTrackAlert,
          }),
          removeTracker: jest.fn(),
        }

        const analytics = new AnalyticsTracker('namespace', 'endpoint', mockAnalyticsClient)
        analytics.trackingEnabled = true

        analytics.trackAlertDisplayEvent(AlertEvent.ADD_CARD_CAMERA_BROKEN)

        expect(mockTrackAlert).toHaveBeenCalledWith({
          schema: ANALYTICS_MOBILE_ALERT_EVENT_SCHEMA,
          data: {
            action: AlertInteractionEvent.ALERT_DISPLAY,
            text: AlertEvent.ADD_CARD_CAMERA_BROKEN,
          },
        })
      })
    })
  })

  describe('trackAlertActionEvent', () => {
    it('should not track when missing tracker', async () => {
      const mockTrackAlert = jest.fn()
      const mockAnalyticsClient = {
        newTracker: jest.fn(),
        getTracker: jest.fn(),
        removeTracker: jest.fn(),
      }

      const analytics = new AnalyticsTracker('namespace', 'endpoint', mockAnalyticsClient)
      analytics.trackingEnabled = true

      analytics.trackAlertActionEvent(AlertEvent.ADD_CARD_CAMERA_BROKEN, 'ok')

      expect(mockTrackAlert).not.toHaveBeenCalled()
    })

    it('should not track when tracking disabled', async () => {
      const mockTrackAlert = jest.fn()
      const mockAnalyticsClient = {
        newTracker: jest.fn(),
        getTracker: jest.fn().mockReturnValue({
          trackSelfDescribingEvent: mockTrackAlert,
        }),
        removeTracker: jest.fn(),
      }

      const analytics = new AnalyticsTracker('namespace', 'endpoint', mockAnalyticsClient)
      analytics.trackingEnabled = false

      analytics.trackAlertActionEvent(AlertEvent.ADD_CARD_CAMERA_BROKEN, 'ok')

      expect(mockTrackAlert).not.toHaveBeenCalled()
    })

    it('should track when tracking enabled and valid alert event', async () => {
      const mockTrackAlert = jest.fn()
      const mockAnalyticsClient = {
        newTracker: jest.fn(),
        getTracker: jest.fn().mockReturnValue({
          trackSelfDescribingEvent: mockTrackAlert,
        }),
        removeTracker: jest.fn(),
      }

      const analytics = new AnalyticsTracker('namespace', 'endpoint', mockAnalyticsClient)
      analytics.trackingEnabled = true

      analytics.trackAlertActionEvent(AlertEvent.ADD_CARD_CAMERA_BROKEN, 'ok')

      expect(mockTrackAlert).toHaveBeenCalledWith({
        schema: ANALYTICS_MOBILE_ALERT_EVENT_SCHEMA,
        data: {
          action: AlertInteractionEvent.ALERT_ACTION,
          text: AlertEvent.ADD_CARD_CAMERA_BROKEN,
          message: 'ok',
        },
      })
    })
  })
})
