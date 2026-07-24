import { AppEventCode } from '@/events/appEventCode'
import { reportProblem } from '@/utils/logger'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AppError } from '../appError'
import { ErrorCategory } from '../errorRegistry'
import { BCSCErrorModal, BCSCErrorModalProps, ErrorModalPayload } from './ErrorModal'

// AppError reads the active screen off navigationRef at construction. Mocking the leaf keeps
// this suite from pulling the whole navigator/store import chain in through appError.ts.
jest.mock('@/contexts/NavigationContainerContext', () => ({
  navigationRef: {
    isReady: jest.fn(() => false),
    getCurrentRoute: jest.fn(() => undefined),
  },
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
  reportProblem: jest.fn(() => 'TEST-CODE'),
}))

jest.mock('@bifold/core', () => ({
  ...jest.requireActual('@bifold/core'),
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

const validError = new AppError(
  'Technical details here',
  { category: ErrorCategory.GENERAL, appEvent: AppEventCode.GENERAL, statusCode: 2800 },
  { track: false }
)

const validPayload: ErrorModalPayload = {
  title: 'Test Error Title',
  description: 'Something went wrong.',
  error: validError,
}

const defaultProps: BCSCErrorModalProps = {
  payload: null,
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
      const { queryByTestId } = renderModal({ payload: null })

      expect(queryByTestId('com.aries.bifold:id/HeaderText')).toBeNull()
    })

    it('should render when visible is true and error is provided', () => {
      const { queryByTestId } = renderModal({ payload: validPayload })

      expect(queryByTestId('com.aries.bifold:id/HeaderText')).not.toBeNull()
    })

    it('should call onDismiss when Close button is pressed', () => {
      const onDismiss = jest.fn()
      const { getByTestId } = renderModal({ payload: validPayload, onDismiss })

      fireEvent.press(getByTestId('com.aries.bifold:id/CloseButton'))

      expect(onDismiss).toHaveBeenCalledTimes(1)
    })
  })

  describe('content rendering', () => {
    it('should display error title and description', () => {
      const { getByText } = renderModal({ payload: validPayload })

      expect(getByText('Test Error Title')).toBeTruthy()
      expect(getByText('Something went wrong.')).toBeTruthy()
    })

    it('should display version number', () => {
      const { getByText } = renderModal({ payload: validPayload })

      expect(getByText('Settings.Version 1.0.0 (42)')).toBeTruthy()
    })

    it('should show details toggle when message is present', () => {
      const { getByTestId } = renderModal({ payload: validPayload })

      expect(getByTestId('com.aries.bifold:id/ShowDetails')).toBeTruthy()
    })

    it('should show details toggle even when the error message is empty', () => {
      // The card's message is AppError.fullMessage, which always carries the Debug code line —
      // so the details toggle is available for every AppError, including empty-message ones
      const emptyMessageError = new AppError(
        '',
        { category: ErrorCategory.GENERAL, appEvent: AppEventCode.GENERAL, statusCode: 2800 },
        { track: false }
      )
      const { getByTestId } = renderModal({ payload: { ...validPayload, error: emptyMessageError } })

      expect(getByTestId('com.aries.bifold:id/ShowDetails')).toBeTruthy()
    })

    it('should reveal technical details when Show Details is pressed', () => {
      const { getByTestId, queryByTestId } = renderModal({ payload: validPayload })

      expect(queryByTestId('com.aries.bifold:id/DetailsText')).toBeNull()

      fireEvent.press(getByTestId('com.aries.bifold:id/ShowDetails'))

      expect(getByTestId('com.aries.bifold:id/DetailsText')).toBeTruthy()
    })
  })

  describe('report button', () => {
    it('should show Report button when enableReport is true', () => {
      const { getByTestId } = renderModal({ payload: validPayload, enableReport: true })

      expect(getByTestId('com.aries.bifold:id/ReportThisProblem')).toBeTruthy()
    })

    it('should hide Report button when enableReport is false', () => {
      const { queryByTestId } = renderModal({ payload: validPayload, enableReport: false })

      expect(queryByTestId('com.aries.bifold:id/ReportThisProblem')).toBeNull()
    })

    it('should track analytics via trackAlertActionEvent when report is pressed', () => {
      const { getByTestId } = renderModal({ payload: validPayload, enableReport: true })

      fireEvent.press(getByTestId('com.aries.bifold:id/ReportThisProblem'))

      expect(Analytics.trackAlertActionEvent).toHaveBeenCalledWith('general', 'Report this problem')
    })

    it('should report error via logger when report is pressed', () => {
      const { getByTestId } = renderModal({ payload: validPayload, enableReport: true })

      fireEvent.press(getByTestId('com.aries.bifold:id/ReportThisProblem'))

      expect(reportProblem).toHaveBeenCalledWith({
        title: validPayload.title,
        description: validPayload.description,
        code: validPayload.error.statusCode,
        error: validPayload.error,
        installId: validPayload.reportUUID,
      })
    })

    it('should surface the reference code returned by reportProblem after reporting', () => {
      const { getByTestId, getByText } = renderModal({ payload: validPayload, enableReport: true })

      fireEvent.press(getByTestId('com.aries.bifold:id/ReportThisProblem'))

      expect(getByTestId('com.aries.bifold:id/ReportId')).toBeTruthy()
      expect(getByText('TEST-CODE')).toBeTruthy()
      expect(getByTestId('com.aries.bifold:id/CopyReportId')).toBeTruthy()
    })

    it('passes the full AppError to reportProblem so screen/request context rides along in error.toJSON()', () => {
      // The modal no longer string-appends Screen/Request to the report message — the whole
      // AppError is handed to reportProblem, whose Loki payload serializes error.toJSON()
      // (screen + context incl. url/method). This pins that the error object arrives intact.
      const contextError = new AppError(
        'JWE decryption failed',
        { category: ErrorCategory.GENERAL, appEvent: AppEventCode.GENERAL, statusCode: 2507 },
        { track: false }
      )
      contextError.addContext({ url: 'https://example.com/userinfo', method: 'GET' })

      const payload: ErrorModalPayload = {
        ...validPayload,
        error: contextError,
        reportUUID: 'report-uuid-123',
      }
      const { getByTestId } = renderModal({ payload, enableReport: true })

      fireEvent.press(getByTestId('com.aries.bifold:id/ReportThisProblem'))

      const reported = (reportProblem as jest.Mock).mock.calls[0][0] as { error: AppError }
      expect(reported.error).toBe(contextError)
      expect(reported.error.context).toEqual({ url: 'https://example.com/userinfo', method: 'GET' })
    })

    it('should disable the Report button after being pressed', async () => {
      const { getByTestId } = renderModal({ payload: validPayload, enableReport: true })

      const reportBtn = getByTestId('com.aries.bifold:id/ReportThisProblem')
      fireEvent.press(reportBtn)

      await waitFor(() => {
        expect(reportBtn.props.accessibilityState?.disabled).toBe(true)
      })
    })
  })

  describe('errorKey reset', () => {
    it('should reset showDetails and reported state when errorKey changes', () => {
      const { getByTestId, queryByTestId, rerender } = renderModal({
        payload: validPayload,
        errorKey: 1,
        enableReport: true,
      })

      fireEvent.press(getByTestId('com.aries.bifold:id/ShowDetails'))
      fireEvent.press(getByTestId('com.aries.bifold:id/ReportThisProblem'))

      rerender(
        <BCSCErrorModal
          {...defaultProps}
          payload={{ ...validPayload, title: 'Second Error' }}
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
