import { AlertInteractionEvent, AppEventCode } from '@/events/appEventCode'
import { AnalyticsTracker } from '@/utils/analytics/analytics-tracker'

describe('Analytics Tracker', () => {
  it('should contstruct properly', () => {
    const analytics = new AnalyticsTracker('namespace', 'endpoint')

    expect(analytics).toBeInstanceOf(AnalyticsTracker)
  })

  describe('initializeTracker', () => {
    it('should initialize tracker', async () => {
      const mockNewTracker = jest.fn()
      const mockAnalyticsClient = {
        newTracker: mockNewTracker,
      }

      const analytics = new AnalyticsTracker('namespace', 'endpoint', mockAnalyticsClient)

      // First initialization
      await analytics.initializeTracker()
      expect(mockNewTracker).toHaveBeenCalledTimes(1)
    })
  })

  describe('hasTracker', () => {
    it('should return true if tracker exists', async () => {
      const mockAnalyticsClient = {
        newTracker: jest.fn().mockReturnValue({}),
      }

      const analytics = new AnalyticsTracker('namespace', 'endpoint', mockAnalyticsClient)

      await analytics.initializeTracker()

      expect(analytics.hasTracker()).toBe(true)
    })

    it('should return false if tracker is not initialized', () => {
      const analytics = new AnalyticsTracker('namespace', 'endpoint')

      expect(analytics.hasTracker()).toBe(false)
    })

    it('should return false if tracking not enabled', async () => {
      const mockAnalyticsClient = {
        newTracker: jest.fn(),
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
      }

      const analytics = new AnalyticsTracker('namespace', 'endpoint', mockAnalyticsClient)

      analytics.trackScreenEvent('HomeScreen')

      expect(mockTrackScreenView).not.toHaveBeenCalled()
    })

    it('should not track when screen name === previous screen name', async () => {
      const mockTrackScreenView = jest.fn()
      const mockAnalyticsClient = {
        newTracker: jest.fn(),
      }

      const analytics = new AnalyticsTracker('namespace', 'endpoint', mockAnalyticsClient)

      analytics.trackScreenEvent('HomeScreen', 'HomeScreen')

      expect(mockTrackScreenView).not.toHaveBeenCalled()
    })

    it('should track when tracking enabled and valid screen names', async () => {
      const mockTrackScreenView = jest.fn()
      const mockAnalyticsClient = {
        newTracker: jest.fn().mockResolvedValue({
          trackScreenViewEvent: mockTrackScreenView,
        }),
      }

      const analytics = new AnalyticsTracker('namespace', 'endpoint', mockAnalyticsClient)

      await analytics.initializeTracker()

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
      }

      const analytics = new AnalyticsTracker('namespace', 'endpoint', mockAnalyticsClient)

      analytics.trackErrorEvent({ code: 'test', message: 'Test error' })

      expect(mockTrackError).not.toHaveBeenCalled()
    })

    it('should track when tracking enabled and valid error', async () => {
      const mockTrackError = jest.fn()
      const mockAnalyticsClient = {
        newTracker: jest.fn().mockResolvedValue({
          trackSelfDescribingEvent: mockTrackError,
        }),
      }

      const analytics = new AnalyticsTracker('namespace', 'endpoint', mockAnalyticsClient)

      await analytics.initializeTracker()

      analytics.trackErrorEvent({ code: 'test', message: 'Test error' })

      expect(mockTrackError).toHaveBeenCalledWith({
        schema: 'iglu:ca.bc.gov.idim/mobile_error/jsonschema/1-0-0',
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
        }

        const analytics = new AnalyticsTracker('namespace', 'endpoint', mockAnalyticsClient)

        analytics.trackAlertDisplayEvent(AppEventCode.ADD_CARD_CAMERA_BROKEN)

        expect(mockTrackAlert).not.toHaveBeenCalled()
      })

      it('should track when tracking enabled and valid alert event', async () => {
        const mockTrackAlert = jest.fn()
        const mockAnalyticsClient = {
          newTracker: jest.fn().mockResolvedValue({
            trackSelfDescribingEvent: mockTrackAlert,
          }),
        }

        const analytics = new AnalyticsTracker('namespace', 'endpoint', mockAnalyticsClient)

        await analytics.initializeTracker()

        analytics.trackAlertDisplayEvent(AppEventCode.ADD_CARD_CAMERA_BROKEN)

        expect(mockTrackAlert).toHaveBeenCalledWith({
          schema: 'iglu:ca.bc.gov.idim/action/jsonschema/1-0-0',
          data: {
            action: AlertInteractionEvent.ALERT_DISPLAY,
            text: AppEventCode.ADD_CARD_CAMERA_BROKEN,
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
      }

      const analytics = new AnalyticsTracker('namespace', 'endpoint', mockAnalyticsClient)

      analytics.trackAlertActionEvent(AppEventCode.ADD_CARD_CAMERA_BROKEN, 'ok')

      expect(mockTrackAlert).not.toHaveBeenCalled()
    })

    it('should track when tracking enabled and valid alert event', async () => {
      const mockTrackAlert = jest.fn()
      const mockAnalyticsClient = {
        newTracker: jest.fn().mockResolvedValue({
          trackSelfDescribingEvent: mockTrackAlert,
        }),
      }

      const analytics = new AnalyticsTracker('namespace', 'endpoint', mockAnalyticsClient)

      await analytics.initializeTracker()

      analytics.trackAlertActionEvent(AppEventCode.ADD_CARD_CAMERA_BROKEN, 'ok')

      expect(mockTrackAlert).toHaveBeenCalledWith({
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
