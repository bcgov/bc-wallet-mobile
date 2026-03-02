import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { DeviceEventEmitter } from 'react-native'
import { BCSCErrorModal, ErrorModalPayload } from './ErrorModal'

const mockTrackErrorInAnalytics = jest.fn()
const mockGetErrorDefinitionFromAppEventCode = jest.fn()

jest.mock('../errors/errorHandler', () => ({
  trackErrorInAnalytics: (...args: unknown[]) => mockTrackErrorInAnalytics(...args),
  getErrorDefinitionFromAppEventCode: (...args: unknown[]) => mockGetErrorDefinitionFromAppEventCode(...args),
}))

jest.mock('../utils/analytics/analytics-singleton', () => ({
  Analytics: {
    trackErrorEvent: jest.fn(),
    trackAlertDisplayEvent: jest.fn(),
    trackAlertActionEvent: jest.fn(),
  },
}))

jest.mock('react-native-device-info', () => ({
  getVersion: () => '1.0.0',
  getBuildNumber: () => '42',
}))

jest.mock('react-native-safe-area-context', () => {
  const { createElement } = jest.requireActual('react')
  return {
    SafeAreaView: ({ children, ...props }: any) => createElement('SafeAreaView', props, children),
  }
})

jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon')

jest.mock('@bifold/core', () => ({
  EventTypes: {
    ERROR_ADDED: 'ERROR_ADDED',
    ERROR_REMOVED: 'ERROR_REMOVED',
  },
  testIdWithKey: (key: string) => `com.aries.bifold:id/${key}`,
  useTheme: () => ({
    ColorPalette: {
      grayscale: {
        black: '#000000',
        darkGrey: '#313132',
        mediumGrey: '#606060',
        lightGrey: '#D3D3D3',
        white: '#FFFFFF',
      },
      brand: {
        primary: '#003366',
        primaryDisabled: '#757575',
        link: '#1A5A96',
      },
      semantic: {
        success: '#2E8540',
      },
      notification: {
        popupOverlay: 'rgba(0, 0, 0, 0.5)',
      },
    },
  }),
}))

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

const { Analytics } = jest.requireMock('../utils/analytics/analytics-singleton')
const { EventTypes } = jest.requireMock('@bifold/core')

const validPayload: ErrorModalPayload = {
  title: 'Test Error Title',
  description: 'Something went wrong.',
  message: 'Technical details here',
  code: 2800,
  appEvent: 'general',
}

describe('BCSCErrorModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    DeviceEventEmitter.removeAllListeners()
  })

  describe('visibility', () => {
    it('should not render when no error has been emitted', () => {
      const { queryByTestId } = render(<BCSCErrorModal />)

      expect(queryByTestId('com.aries.bifold:id/HeaderText')).toBeNull()
    })

    it('should render when ERROR_ADDED is emitted with a valid payload', () => {
      const { queryByTestId } = render(<BCSCErrorModal />)

      act(() => {
        DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, validPayload)
      })

      expect(queryByTestId('com.aries.bifold:id/HeaderText')).not.toBeNull()
    })

    it('should not render for invalid payloads', () => {
      const { queryByTestId } = render(<BCSCErrorModal />)

      act(() => {
        DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, { foo: 'bar' })
      })

      expect(queryByTestId('com.aries.bifold:id/HeaderText')).toBeNull()
    })

    it('should dismiss when ERROR_REMOVED is emitted', () => {
      const { queryByTestId } = render(<BCSCErrorModal />)

      act(() => {
        DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, validPayload)
      })
      expect(queryByTestId('com.aries.bifold:id/HeaderText')).not.toBeNull()

      act(() => {
        DeviceEventEmitter.emit(EventTypes.ERROR_REMOVED)
      })
      expect(queryByTestId('com.aries.bifold:id/HeaderText')).toBeNull()
    })

    it('should dismiss when Okay button is pressed', () => {
      const { queryByTestId, getByTestId } = render(<BCSCErrorModal />)

      act(() => {
        DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, validPayload)
      })

      fireEvent.press(getByTestId('com.aries.bifold:id/Okay'))
      expect(queryByTestId('com.aries.bifold:id/HeaderText')).toBeNull()
    })
  })

  describe('content rendering', () => {
    it('should display error title and description', () => {
      const { getByText } = render(<BCSCErrorModal />)

      act(() => {
        DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, validPayload)
      })

      expect(getByText('Test Error Title')).toBeTruthy()
      expect(getByText('Something went wrong.')).toBeTruthy()
    })

    it('should display version number', () => {
      const { getByText } = render(<BCSCErrorModal />)

      act(() => {
        DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, validPayload)
      })

      expect(getByText('Settings.Version 1.0.0 (42)')).toBeTruthy()
    })

    it('should show details toggle when message is present', () => {
      const { getByTestId } = render(<BCSCErrorModal />)

      act(() => {
        DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, validPayload)
      })

      expect(getByTestId('com.aries.bifold:id/ShowDetails')).toBeTruthy()
    })

    it('should not show details toggle when message is empty', () => {
      const { queryByTestId } = render(<BCSCErrorModal />)

      act(() => {
        DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, { ...validPayload, message: '' })
      })

      expect(queryByTestId('com.aries.bifold:id/ShowDetails')).toBeNull()
    })

    it('should reveal technical details when Show Details is pressed', () => {
      const { getByTestId, queryByTestId } = render(<BCSCErrorModal />)

      act(() => {
        DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, validPayload)
      })

      expect(queryByTestId('com.aries.bifold:id/DetailsText')).toBeNull()

      fireEvent.press(getByTestId('com.aries.bifold:id/ShowDetails'))

      expect(getByTestId('com.aries.bifold:id/DetailsText')).toBeTruthy()
    })
  })

  describe('report button', () => {
    it('should show Report button when enableReport is true', () => {
      const { getByTestId } = render(<BCSCErrorModal enableReport />)

      act(() => {
        DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, validPayload)
      })

      expect(getByTestId('com.aries.bifold:id/ReportThisProblem')).toBeTruthy()
    })

    it('should hide Report button when enableReport is false', () => {
      const { queryByTestId } = render(<BCSCErrorModal enableReport={false} />)

      act(() => {
        DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, validPayload)
      })

      expect(queryByTestId('com.aries.bifold:id/ReportThisProblem')).toBeNull()
    })

    it('should track analytics via trackErrorInAnalytics when appEvent has a definition', () => {
      const mockDefinition = { statusCode: 2800, appEvent: 'general' }
      mockGetErrorDefinitionFromAppEventCode.mockReturnValue(mockDefinition)

      const { getByTestId } = render(<BCSCErrorModal enableReport />)

      act(() => {
        DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, validPayload)
      })

      fireEvent.press(getByTestId('com.aries.bifold:id/ReportThisProblem'))

      expect(mockGetErrorDefinitionFromAppEventCode).toHaveBeenCalledWith('general')
      expect(mockTrackErrorInAnalytics).toHaveBeenCalledWith(mockDefinition, 'alert_action', 'Error.ReportThisProblem')
    })

    it('should fall back to Analytics.trackErrorEvent when appEvent has no definition', () => {
      mockGetErrorDefinitionFromAppEventCode.mockReturnValue(null)

      const { getByTestId } = render(<BCSCErrorModal enableReport />)

      act(() => {
        DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, validPayload)
      })

      fireEvent.press(getByTestId('com.aries.bifold:id/ReportThisProblem'))

      expect(Analytics.trackErrorEvent).toHaveBeenCalledWith({
        code: String(validPayload.code),
        message: validPayload.message,
      })
    })

    it('should fall back to Analytics.trackErrorEvent when appEvent is absent', () => {
      const { getByTestId } = render(<BCSCErrorModal enableReport />)

      act(() => {
        DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, { ...validPayload, appEvent: undefined })
      })

      fireEvent.press(getByTestId('com.aries.bifold:id/ReportThisProblem'))

      expect(Analytics.trackErrorEvent).toHaveBeenCalledWith({
        code: String(validPayload.code),
        message: validPayload.message,
      })
    })

    it('should disable the Report button after being pressed', async () => {
      mockGetErrorDefinitionFromAppEventCode.mockReturnValue(null)

      const { getByTestId } = render(<BCSCErrorModal enableReport />)

      act(() => {
        DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, validPayload)
      })

      const reportBtn = getByTestId('com.aries.bifold:id/ReportThisProblem')
      fireEvent.press(reportBtn)

      await waitFor(() => {
        expect(reportBtn.props.accessibilityState?.disabled).toBe(true)
      })
    })
  })

  describe('normalizePayload', () => {
    it('should handle payloads with missing optional fields', () => {
      const { getByTestId } = render(<BCSCErrorModal />)

      act(() => {
        DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, {
          title: 'Minimal',
          description: 'Minimal payload',
        })
      })

      expect(getByTestId('com.aries.bifold:id/HeaderText')).toBeTruthy()
    })

    it('should reject null payloads', () => {
      const { queryByTestId } = render(<BCSCErrorModal />)

      act(() => {
        DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, null)
      })

      expect(queryByTestId('com.aries.bifold:id/HeaderText')).toBeNull()
    })
  })

  describe('state reset on new error', () => {
    it('should reset showDetails and reported state for a new error', () => {
      mockGetErrorDefinitionFromAppEventCode.mockReturnValue(null)

      const { getByTestId, queryByTestId } = render(<BCSCErrorModal enableReport />)

      // Show first error and interact
      act(() => {
        DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, validPayload)
      })
      fireEvent.press(getByTestId('com.aries.bifold:id/ShowDetails'))
      fireEvent.press(getByTestId('com.aries.bifold:id/ReportThisProblem'))

      // Emit a new error
      act(() => {
        DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, {
          ...validPayload,
          title: 'Second Error',
          message: 'second technical message',
        })
      })

      // Details should be collapsed and report button should be re-enabled
      expect(queryByTestId('com.aries.bifold:id/DetailsText')).toBeNull()
      expect(getByTestId('com.aries.bifold:id/ShowDetails')).toBeTruthy()
      expect(getByTestId('com.aries.bifold:id/ReportThisProblem').props.accessibilityState?.disabled).toBeFalsy()
    })
  })

  describe('cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const removeSpy = jest.spyOn(DeviceEventEmitter, 'removeAllListeners')
      const { unmount } = render(<BCSCErrorModal />)

      const listenerCount = DeviceEventEmitter.listenerCount(EventTypes.ERROR_ADDED)
      expect(listenerCount).toBeGreaterThan(0)

      unmount()
      removeSpy.mockRestore()
    })
  })
})
