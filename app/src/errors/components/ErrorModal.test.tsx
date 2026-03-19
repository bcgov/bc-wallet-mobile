import { appLogger } from '@/utils/logger'
import { BifoldError } from '@bifold/core'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BCSCErrorModal, BCSCErrorModalProps, ErrorModalPayload } from './ErrorModal'

const mockTrackErrorInAnalytics = jest.fn()
const mockGetErrorDefinitionFromAppEventCode = jest.fn()

jest.mock('@/errors/errorHandler', () => ({
  trackErrorInAnalytics: (...args: any[]) => mockTrackErrorInAnalytics(...args),
  getErrorDefinitionFromAppEventCode: (...args: any[]) => mockGetErrorDefinitionFromAppEventCode(...args),
}))

jest.mock('@/utils/analytics/analytics-singleton', () => ({
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
    SafeAreaView: ({ children, ...props }: { children: React.ReactNode } & React.ComponentProps<typeof SafeAreaView>) =>
      createElement('SafeAreaView', props, children),
  }
})

jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon')

jest.mock('@/utils/logger', () => ({
  appLogger: {
    report: jest.fn(),
  },
}))

jest.mock('@bifold/core', () => ({
  testIdWithKey: (key: string) => `com.aries.bifold:id/${key}`,
  BifoldError: jest.requireActual('@bifold/core').BifoldError,
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
        modalPrimary: '#FCBA19',
        link: '#1A5A96',
        text: '#01264C',
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

const { Analytics } = jest.requireMock('@/utils/analytics/analytics-singleton')

const validPayload: ErrorModalPayload = {
  title: 'Test Error Title',
  description: 'Something went wrong.',
  message: 'Technical details here',
  code: 2800,
  appEvent: 'general',
}

const defaultProps: BCSCErrorModalProps = {
  error: null,
  visible: false,
  errorKey: 0,
  onDismiss: jest.fn(),
  enableReport: true,
}

const renderModal = (overrides: Partial<BCSCErrorModalProps> = {}) =>
  render(<BCSCErrorModal {...defaultProps} {...overrides} />)

describe('BCSCErrorModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('visibility', () => {
    it('should not render when visible is false', () => {
      const { queryByTestId } = renderModal()

      expect(queryByTestId('com.aries.bifold:id/HeaderText')).toBeNull()
    })

    it('should not render when error is null', () => {
      const { queryByTestId } = renderModal({ visible: true, error: null })

      expect(queryByTestId('com.aries.bifold:id/HeaderText')).toBeNull()
    })

    it('should render when visible is true and error is provided', () => {
      const { queryByTestId } = renderModal({ visible: true, error: validPayload })

      expect(queryByTestId('com.aries.bifold:id/HeaderText')).not.toBeNull()
    })

    it('should call onDismiss when Okay button is pressed', () => {
      const onDismiss = jest.fn()
      const { getByTestId } = renderModal({ visible: true, error: validPayload, onDismiss })

      fireEvent.press(getByTestId('com.aries.bifold:id/Okay'))

      expect(onDismiss).toHaveBeenCalledTimes(1)
    })
  })

  describe('content rendering', () => {
    it('should display error title and description', () => {
      const { getByText } = renderModal({ visible: true, error: validPayload })

      expect(getByText('Test Error Title')).toBeTruthy()
      expect(getByText('Something went wrong.')).toBeTruthy()
    })

    it('should display version number', () => {
      const { getByText } = renderModal({ visible: true, error: validPayload })

      expect(getByText('Settings.Version 1.0.0 (42)')).toBeTruthy()
    })

    it('should show details toggle when message is present', () => {
      const { getByTestId } = renderModal({ visible: true, error: validPayload })

      expect(getByTestId('com.aries.bifold:id/ShowDetails')).toBeTruthy()
    })

    it('should not show details toggle when message is empty', () => {
      const { queryByTestId } = renderModal({ visible: true, error: { ...validPayload, message: '' } })

      expect(queryByTestId('com.aries.bifold:id/ShowDetails')).toBeNull()
    })

    it('should reveal technical details when Show Details is pressed', () => {
      const { getByTestId, queryByTestId } = renderModal({ visible: true, error: validPayload })

      expect(queryByTestId('com.aries.bifold:id/DetailsText')).toBeNull()

      fireEvent.press(getByTestId('com.aries.bifold:id/ShowDetails'))

      expect(getByTestId('com.aries.bifold:id/DetailsText')).toBeTruthy()
    })
  })

  describe('report button', () => {
    it('should show Report button when enableReport is true', () => {
      const { getByTestId } = renderModal({ visible: true, error: validPayload, enableReport: true })

      expect(getByTestId('com.aries.bifold:id/ReportThisProblem')).toBeTruthy()
    })

    it('should hide Report button when enableReport is false', () => {
      const { queryByTestId } = renderModal({ visible: true, error: validPayload, enableReport: false })

      expect(queryByTestId('com.aries.bifold:id/ReportThisProblem')).toBeNull()
    })

    it('should track analytics via trackAlertActionEvent when report is pressed', () => {
      const { getByTestId } = renderModal({ visible: true, error: validPayload, enableReport: true })

      fireEvent.press(getByTestId('com.aries.bifold:id/ReportThisProblem'))

      expect(Analytics.trackAlertActionEvent).toHaveBeenCalledWith('general', 'Report this problem')
    })

    it('should report error via logger when report is pressed', () => {
      const { getByTestId } = renderModal({ visible: true, error: validPayload, enableReport: true })

      fireEvent.press(getByTestId('com.aries.bifold:id/ReportThisProblem'))

      expect(appLogger.report).toHaveBeenCalledWith(
        new BifoldError(validPayload.title, validPayload.description, validPayload.message, validPayload.code)
      )
    })

    it('should disable the Report button after being pressed', async () => {
      mockGetErrorDefinitionFromAppEventCode.mockReturnValue(null)

      const { getByTestId } = renderModal({ visible: true, error: validPayload, enableReport: true })

      const reportBtn = getByTestId('com.aries.bifold:id/ReportThisProblem')
      fireEvent.press(reportBtn)

      await waitFor(() => {
        expect(reportBtn.props.accessibilityState?.disabled).toBe(true)
      })
    })
  })

  describe('errorKey reset', () => {
    it('should reset showDetails and reported state when errorKey changes', () => {
      mockGetErrorDefinitionFromAppEventCode.mockReturnValue(null)

      const { getByTestId, queryByTestId, rerender } = renderModal({
        visible: true,
        error: validPayload,
        errorKey: 1,
        enableReport: true,
      })

      fireEvent.press(getByTestId('com.aries.bifold:id/ShowDetails'))
      fireEvent.press(getByTestId('com.aries.bifold:id/ReportThisProblem'))

      rerender(
        <BCSCErrorModal
          {...defaultProps}
          visible
          error={{ ...validPayload, title: 'Second Error', message: 'second technical message' }}
          errorKey={2}
          enableReport
        />
      )

      expect(queryByTestId('com.aries.bifold:id/DetailsText')).toBeNull()
      expect(getByTestId('com.aries.bifold:id/ShowDetails')).toBeTruthy()
      expect(getByTestId('com.aries.bifold:id/ReportThisProblem').props.accessibilityState?.disabled).toBeFalsy()
    })
  })
})
