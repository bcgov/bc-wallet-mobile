import { AppEventCode } from '@/events/appEventCode'
import { TestIds } from '@/test-ids/registry'
import { reportProblem } from '@/utils/logger'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AppError } from '../appError'
import { ErrorCategory } from '../errorRegistry'
import { BCSCAlertModal, BCSCAlertModalProps, ModalPayload } from './AlertModal'
import { colors } from './ModalCard'

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

const validPayload: Extract<ModalPayload, { kind: 'error' }> = {
  kind: 'error',
  enableReport: true,
  title: 'Test Error Title',
  description: 'Something went wrong.',
  error: validError,
  installId: 'default-install-id',
  buildHistory: '4.0.0+100 < 3.9.0+90',
}

const defaultProps: BCSCAlertModalProps = {
  payload: null,
  errorKey: 0,
  onDismiss: jest.fn(),
}

// The icon left of the title: the first MaterialIcons in the card (mocked to a host 'Icon')
const headerIcon = (root: ReturnType<typeof render>['UNSAFE_root']) =>
  root.findAll((node) => (node.type as unknown) === 'Icon')[0].props

const renderModal = (overrides: Partial<BCSCAlertModalProps> = {}) =>
  render(<BCSCAlertModal {...defaultProps} {...overrides} />)

describe('BCSCAlertModal with an error', () => {
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
    it('should show the red error icon', () => {
      const { UNSAFE_root } = renderModal({ payload: validPayload })

      expect(headerIcon(UNSAFE_root)).toMatchObject({ name: 'error', color: colors.errorIcon })
    })

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
      const { getByTestId } = renderModal({ payload: validPayload })

      expect(getByTestId('com.aries.bifold:id/ReportThisProblem')).toBeTruthy()
    })

    it('should hide Report button when enableReport is false', () => {
      const { queryByTestId } = renderModal({ payload: { ...validPayload, enableReport: false } })

      expect(queryByTestId('com.aries.bifold:id/ReportThisProblem')).toBeNull()
    })

    it('should track analytics via trackAlertActionEvent when report is pressed', () => {
      const { getByTestId } = renderModal({ payload: validPayload })

      fireEvent.press(getByTestId('com.aries.bifold:id/ReportThisProblem'))

      expect(Analytics.trackAlertActionEvent).toHaveBeenCalledWith('general', 'Report this problem')
    })

    it('should report error via logger when report is pressed', () => {
      const { getByTestId } = renderModal({ payload: validPayload })

      fireEvent.press(getByTestId('com.aries.bifold:id/ReportThisProblem'))

      expect(reportProblem).toHaveBeenCalledWith({
        title: validPayload.title,
        description: validPayload.description,
        code: validPayload.error.statusCode,
        error: validPayload.error,
        installId: validPayload.installId,
        buildHistory: validPayload.buildHistory,
      })
    })

    it('should surface the reference code returned by reportProblem after reporting', () => {
      const { getByTestId, getByText } = renderModal({ payload: validPayload })

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

      const payload: Extract<ModalPayload, { kind: 'error' }> = {
        ...validPayload,
        error: contextError,
        installId: 'install-id-123',
      }
      const { getByTestId } = renderModal({ payload })

      fireEvent.press(getByTestId('com.aries.bifold:id/ReportThisProblem'))

      const reported = (reportProblem as jest.Mock).mock.calls[0][0] as { error: AppError }
      expect(reported.error).toBe(contextError)
      expect(reported.error.context).toEqual({ url: 'https://example.com/userinfo', method: 'GET' })
    })

    it('should disable the Report button after being pressed', async () => {
      const { getByTestId } = renderModal({ payload: validPayload })

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
      })

      fireEvent.press(getByTestId('com.aries.bifold:id/ShowDetails'))
      fireEvent.press(getByTestId('com.aries.bifold:id/ReportThisProblem'))

      rerender(<BCSCAlertModal {...defaultProps} payload={{ ...validPayload, title: 'Second Error' }} errorKey={2} />)

      expect(queryByTestId('com.aries.bifold:id/DetailsText')).toBeNull()
      expect(getByTestId('com.aries.bifold:id/ShowDetails')).toBeTruthy()
      expect(getByTestId('com.aries.bifold:id/ReportThisProblem').props.accessibilityState?.disabled).toBeFalsy()
    })
  })
})

describe('BCSCAlertModal with an alert', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const actionButton = (index: number) => `com.aries.bifold:id/${TestIds.alertModal.action}${index}`

  it('renders the title, description and one button per action in order', () => {
    const { getByText, getByTestId, queryByTestId, UNSAFE_root } = renderModal({
      payload: {
        kind: 'alert',
        title: 'Alert Title',
        description: 'Alert Description',
        actions: [{ text: 'Cancel', style: 'cancel' }, { text: 'Continue' }],
      },
    })

    expect(getByText('Alert Title')).toBeTruthy()
    expect(getByText('Alert Description')).toBeTruthy()
    expect(getByTestId(actionButton(0))).toHaveTextContent('Cancel')
    expect(getByTestId(actionButton(1))).toHaveTextContent('Continue')
    expect(headerIcon(UNSAFE_root)).toMatchObject({ name: 'info', color: colors.infoIcon })
    // The error card's controls are not part of an alert
    expect(queryByTestId('com.aries.bifold:id/ReportThisProblem')).toBeNull()
  })

  it('dismisses, runs the action and tracks it when a button is pressed', () => {
    const onDismiss = jest.fn()
    const onPress = jest.fn()
    const { getByTestId } = renderModal({
      payload: {
        kind: 'alert',
        title: 'Alert Title',
        description: 'Alert Description',
        actions: [{ text: 'Delete', style: 'destructive', onPress }],
        event: AppEventCode.GENERAL,
      },
      onDismiss,
    })

    fireEvent.press(getByTestId(actionButton(0)))

    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(onPress).toHaveBeenCalledTimes(1)
    expect(Analytics.trackAlertActionEvent).toHaveBeenCalledWith(AppEventCode.GENERAL, 'Delete')
  })

  it('runs the cancel action on Android back', () => {
    const onDismiss = jest.fn()
    const onCancel = jest.fn()
    const { UNSAFE_getByType } = renderModal({
      payload: {
        kind: 'alert',
        title: 'Alert Title',
        description: 'Alert Description',
        actions: [{ text: 'Cancel', style: 'cancel', onPress: onCancel }, { text: 'Continue' }],
      },
      onDismiss,
    })

    UNSAFE_getByType(Modal).props.onRequestClose()

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('stays open on Android back when it has no cancel action', () => {
    const onDismiss = jest.fn()
    const onPress = jest.fn()
    const { UNSAFE_getByType } = renderModal({
      payload: {
        kind: 'alert',
        title: 'Alert Title',
        description: 'Alert Description',
        actions: [{ text: 'Update', onPress }],
      },
      onDismiss,
    })

    UNSAFE_getByType(Modal).props.onRequestClose()

    expect(onDismiss).not.toHaveBeenCalled()
    expect(onPress).not.toHaveBeenCalled()
  })
})
