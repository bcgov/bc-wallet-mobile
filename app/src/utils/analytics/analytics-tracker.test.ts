import { AlertInteractionEvent, AppEventCode } from '@/events/appEventCode'
import { AnalyticsTracker } from '@/utils/analytics/analytics-tracker'

describe('Analytics Tracker', () => {
  it('should construct properly', () => {
    const analytics = new AnalyticsTracker('endpoint')

    expect(analytics).toBeInstanceOf(AnalyticsTracker)
  })

  describe('initializeTracker', () => {
    it('should initialize tracker', async () => {
      const mockNewTracker = jest.fn()
      const mockAnalyticsClient = {
        newTracker: mockNewTracker,
      }

      const analytics = new AnalyticsTracker('endpoint', mockAnalyticsClient)

      // First initialization
      await analytics.initializeTracker('testAppId')
      expect(mockNewTracker).toHaveBeenCalledTimes(1)
    })
  })

  describe('hasTracker', () => {
    it('should return true if tracker exists', async () => {
      const mockAnalyticsClient = {
        newTracker: jest.fn().mockReturnValue({}),
      }

      const analytics = new AnalyticsTracker('endpoint', mockAnalyticsClient)

      await analytics.initializeTracker('testAppId')

      expect(analytics.hasTracker()).toBe(true)
    })

    it('should return false if tracker is not initialized', () => {
      const analytics = new AnalyticsTracker('endpoint')

      expect(analytics.hasTracker()).toBe(false)
    })

    it('should return false if tracking not enabled', async () => {
      const mockAnalyticsClient = {
        newTracker: jest.fn(),
      }

      const analytics = new AnalyticsTracker('endpoint', mockAnalyticsClient)

      expect(analytics.hasTracker()).toBe(false)
    })
  })

  describe('setAppId', () => {
    it('should set app ID when tracker exists', async () => {
      const mockSetAppId = jest.fn()
      const mockAnalyticsClient = {
        newTracker: jest.fn().mockResolvedValue({
          setAppId: mockSetAppId,
        }),
      }

      const analytics = new AnalyticsTracker('endpoint', mockAnalyticsClient)

      await analytics.initializeTracker('testAppId')

      analytics.setAppId('newAppId')

      expect(mockSetAppId).toHaveBeenCalledWith('newAppId')
    })

    it('should not set app ID when tracker does not exist', () => {
      const mockSetAppId = jest.fn()
      const mockAnalyticsClient = {
        newTracker: jest.fn(),
      }

      const analytics = new AnalyticsTracker('endpoint', mockAnalyticsClient)

      analytics.setAppId('newAppId')

      expect(mockSetAppId).not.toHaveBeenCalled()
    })
  })

  describe('trackScreenEvent', () => {
    it('should not track when missing tracker', async () => {
      const mockTrackScreenView = jest.fn()
      const mockAnalyticsClient = {
        newTracker: jest.fn(),
      }

      const analytics = new AnalyticsTracker('endpoint', mockAnalyticsClient)

      analytics.trackScreenEvent('HomeScreen')

      expect(mockTrackScreenView).not.toHaveBeenCalled()
    })

    it('should not track when screen name === previous screen name', async () => {
      const mockTrackScreenView = jest.fn()
      const mockAnalyticsClient = {
        newTracker: jest.fn(),
      }

      const analytics = new AnalyticsTracker('endpoint', mockAnalyticsClient)

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

      const analytics = new AnalyticsTracker('endpoint', mockAnalyticsClient)

      await analytics.initializeTracker('testAppId')

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

      const analytics = new AnalyticsTracker('endpoint', mockAnalyticsClient)

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

      const analytics = new AnalyticsTracker('endpoint', mockAnalyticsClient)

      await analytics.initializeTracker('testAppId')

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

        const analytics = new AnalyticsTracker('endpoint', mockAnalyticsClient)

        analytics.trackAlertDisplayEvent(AppEventCode.ADD_CARD_CAMERA_BROKEN)

        expect(mockTrackAlert).not.toHaveBeenCalled()
      })

      it('should track when tracking enabled and valid app event', async () => {
        const mockTrackAlert = jest.fn()
        const mockAnalyticsClient = {
          newTracker: jest.fn().mockResolvedValue({
            trackSelfDescribingEvent: mockTrackAlert,
          }),
        }

        const analytics = new AnalyticsTracker('endpoint', mockAnalyticsClient)

        await analytics.initializeTracker('testAppId')

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

      const analytics = new AnalyticsTracker('endpoint', mockAnalyticsClient)

      analytics.trackAlertActionEvent(AppEventCode.ADD_CARD_CAMERA_BROKEN, 'ok')

      expect(mockTrackAlert).not.toHaveBeenCalled()
    })

    it('should track when tracking enabled and valid app event', async () => {
      const mockTrackAlert = jest.fn()
      const mockAnalyticsClient = {
        newTracker: jest.fn().mockResolvedValue({
          trackSelfDescribingEvent: mockTrackAlert,
        }),
      }

      const analytics = new AnalyticsTracker('endpoint', mockAnalyticsClient)

      await analytics.initializeTracker('testAppId')

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
