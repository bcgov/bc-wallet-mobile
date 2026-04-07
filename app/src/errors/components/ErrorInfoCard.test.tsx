import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { ErrorInfoCard, ErrorInfoCardProps, colors as errorInfoCardColors } from './ErrorInfoCard'

jest.mock('react-native-device-info', () => ({
  getVersion: () => '1.0.0',
  getBuildNumber: () => '42',
}))

jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon')
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'CommunityIcon')

jest.mock('@bifold/core', () => ({
  testIdWithKey: (key: string) => `com.aries.bifold:id/${key}`,
}))

const mockOnDismiss = jest.fn()
const mockOnReport = jest.fn()

const defaultProps: ErrorInfoCardProps = {
  title: 'Test Error',
  description: 'Something went wrong.',
  onDismiss: mockOnDismiss,
}

describe('ErrorInfoCard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('content rendering', () => {
    it('should display title and description', () => {
      const { getByText } = render(<ErrorInfoCard {...defaultProps} />)

      expect(getByText('Test Error')).toBeTruthy()
      expect(getByText('Something went wrong.')).toBeTruthy()
    })

    it('should display version number', () => {
      const { getByText } = render(<ErrorInfoCard {...defaultProps} />)

      expect(getByText('Settings.Version 1.0.0 (42)')).toBeTruthy()
    })

    it('should always show the close button', () => {
      const { getByTestId } = render(<ErrorInfoCard {...defaultProps} />)

      expect(getByTestId('com.aries.bifold:id/CloseButton')).toBeTruthy()
    })
  })

  describe('details toggle', () => {
    it('should show details toggle when message is present', () => {
      const { getByTestId } = render(<ErrorInfoCard {...defaultProps} message="Technical details" />)

      expect(getByTestId('com.aries.bifold:id/ShowDetails')).toBeTruthy()
    })

    it('should not show details toggle when message is empty', () => {
      const { queryByTestId } = render(<ErrorInfoCard {...defaultProps} message="" />)

      expect(queryByTestId('com.aries.bifold:id/ShowDetails')).toBeNull()
    })

    it('should not show details toggle when message is absent', () => {
      const { queryByTestId } = render(<ErrorInfoCard {...defaultProps} />)

      expect(queryByTestId('com.aries.bifold:id/ShowDetails')).toBeNull()
    })

    it('should reveal details text when toggle is pressed', () => {
      const { getByTestId, queryByTestId } = render(
        <ErrorInfoCard {...defaultProps} message="Technical details" code={2800} />
      )

      expect(queryByTestId('com.aries.bifold:id/DetailsText')).toBeNull()

      fireEvent.press(getByTestId('com.aries.bifold:id/ShowDetails'))

      expect(getByTestId('com.aries.bifold:id/DetailsText')).toBeTruthy()
    })

    it('should hide details text when toggle is pressed again', () => {
      const { getByTestId, queryByTestId } = render(
        <ErrorInfoCard {...defaultProps} message="Technical details" code={2800} />
      )

      fireEvent.press(getByTestId('com.aries.bifold:id/ShowDetails'))
      expect(getByTestId('com.aries.bifold:id/DetailsText')).toBeTruthy()

      fireEvent.press(getByTestId('com.aries.bifold:id/ShowDetails'))
      expect(queryByTestId('com.aries.bifold:id/DetailsText')).toBeNull()
    })

    it('should format details with error code and message', () => {
      const { getByTestId, getByText } = render(
        <ErrorInfoCard {...defaultProps} message="Technical details" code={2800} />
      )

      fireEvent.press(getByTestId('com.aries.bifold:id/ShowDetails'))

      expect(getByText('Error.ErrorCode 2800 - Technical details')).toBeTruthy()
    })

    it('should use code 0 when code is not provided', () => {
      const { getByTestId, getByText } = render(<ErrorInfoCard {...defaultProps} message="Tech msg" />)

      fireEvent.press(getByTestId('com.aries.bifold:id/ShowDetails'))

      expect(getByText('Error.ErrorCode 0 - Tech msg')).toBeTruthy()
    })

    it('should keep toggle visible after revealing details', () => {
      const { getByTestId } = render(<ErrorInfoCard {...defaultProps} message="Tech msg" />)

      fireEvent.press(getByTestId('com.aries.bifold:id/ShowDetails'))

      expect(getByTestId('com.aries.bifold:id/ShowDetails')).toBeTruthy()
    })

    it('should show "Hide details" text when details are visible', () => {
      const { getByTestId, getByText } = render(<ErrorInfoCard {...defaultProps} message="Tech msg" />)

      fireEvent.press(getByTestId('com.aries.bifold:id/ShowDetails'))

      expect(getByText('Global.HideDetails')).toBeTruthy()
    })

    it('should show "Show details" text after hiding details again', () => {
      const { getByTestId, getByText } = render(<ErrorInfoCard {...defaultProps} message="Tech msg" />)

      fireEvent.press(getByTestId('com.aries.bifold:id/ShowDetails'))
      fireEvent.press(getByTestId('com.aries.bifold:id/ShowDetails'))

      expect(getByText('Global.ShowDetails')).toBeTruthy()
    })
  })

  describe('dismiss button', () => {
    it('should call onDismiss when Close is pressed', () => {
      const { getByTestId } = render(<ErrorInfoCard {...defaultProps} />)

      fireEvent.press(getByTestId('com.aries.bifold:id/CloseButton'))

      expect(mockOnDismiss).toHaveBeenCalledTimes(1)
    })
  })

  describe('report button', () => {
    it('should show report button when enableReport and onReport are provided', () => {
      const { getByTestId } = render(<ErrorInfoCard {...defaultProps} enableReport onReport={mockOnReport} />)

      expect(getByTestId('com.aries.bifold:id/ReportThisProblem')).toBeTruthy()
    })

    it('should not show report button when enableReport is false', () => {
      const { queryByTestId } = render(<ErrorInfoCard {...defaultProps} enableReport={false} onReport={mockOnReport} />)

      expect(queryByTestId('com.aries.bifold:id/ReportThisProblem')).toBeNull()
    })

    it('should not show report button when onReport is not provided', () => {
      const { queryByTestId } = render(<ErrorInfoCard {...defaultProps} enableReport />)

      expect(queryByTestId('com.aries.bifold:id/ReportThisProblem')).toBeNull()
    })

    it('should call onReport when report button is pressed', () => {
      const { getByTestId } = render(<ErrorInfoCard {...defaultProps} enableReport onReport={mockOnReport} />)

      fireEvent.press(getByTestId('com.aries.bifold:id/ReportThisProblem'))

      expect(mockOnReport).toHaveBeenCalledTimes(1)
    })

    it('should disable report button after being pressed', async () => {
      const { getByTestId } = render(<ErrorInfoCard {...defaultProps} enableReport onReport={mockOnReport} />)

      const btn = getByTestId('com.aries.bifold:id/ReportThisProblem')
      fireEvent.press(btn)

      await waitFor(() => {
        expect(btn.props.accessibilityState?.disabled).toBe(true)
      })
    })

    it('should show "Reported" text after pressing report', () => {
      const { getByTestId, getByText } = render(
        <ErrorInfoCard {...defaultProps} enableReport onReport={mockOnReport} />
      )

      fireEvent.press(getByTestId('com.aries.bifold:id/ReportThisProblem'))

      expect(getByText('Error.Reported')).toBeTruthy()
    })
  })

  describe('action button', () => {
    it('should call onDismiss and action.onPress when action button is pressed', () => {
      const mockActionOnPress = jest.fn()
      const action = { text: 'Reset', onPress: mockActionOnPress }
      const { getByTestId } = render(<ErrorInfoCard {...defaultProps} action={action} />)

      fireEvent.press(getByTestId('com.aries.bifold:id/ActionButton'))

      expect(mockOnDismiss).toHaveBeenCalledTimes(1)
      expect(mockActionOnPress).toHaveBeenCalledTimes(1)
    })

    it('should call onDismiss before action.onPress', () => {
      const callOrder: string[] = []
      const mockDismiss = jest.fn(() => callOrder.push('dismiss'))
      const mockAction = jest.fn(() => callOrder.push('action'))
      const action = { text: 'Reset', onPress: mockAction }

      const { getByTestId } = render(<ErrorInfoCard {...defaultProps} onDismiss={mockDismiss} action={action} />)

      fireEvent.press(getByTestId('com.aries.bifold:id/ActionButton'))

      expect(callOrder).toEqual(['dismiss', 'action'])
    })

    it('should apply destructive style when action.style is destructive', () => {
      const action = { text: 'Delete', onPress: jest.fn(), style: 'destructive' as const }
      const { getByTestId } = render(<ErrorInfoCard {...defaultProps} action={action} />)

      const button = getByTestId('com.aries.bifold:id/ActionButton')
      const buttonStyle = Array.isArray(button.props.style)
        ? Object.assign({}, ...button.props.style)
        : button.props.style

      expect(buttonStyle.backgroundColor).toBe(errorInfoCardColors.destructiveButton)
    })

    it('should apply secondary style when action.style is not destructive', () => {
      const action = { text: 'OK', onPress: jest.fn() }
      const { getByTestId } = render(<ErrorInfoCard {...defaultProps} action={action} />)

      const button = getByTestId('com.aries.bifold:id/ActionButton')
      const buttonStyle = Array.isArray(button.props.style)
        ? Object.assign({}, ...button.props.style)
        : button.props.style

      expect(buttonStyle.backgroundColor).toBe(errorInfoCardColors.secondaryButtonBackground)
    })

    it('should not render action button when action is not provided', () => {
      const { queryByTestId } = render(<ErrorInfoCard {...defaultProps} />)

      expect(queryByTestId('com.aries.bifold:id/ActionButton')).toBeNull()
    })
  })

  describe('snapshots', () => {
    it('should match snapshot with default props', () => {
      const tree = render(<ErrorInfoCard {...defaultProps} />)

      expect(tree.toJSON()).toMatchSnapshot()
    })

    it('should match snapshot with details expanded', () => {
      const tree = render(
        <ErrorInfoCard {...defaultProps} message="Technical details" code={2800} enableReport onReport={mockOnReport} />
      )

      fireEvent.press(tree.getByTestId('com.aries.bifold:id/ShowDetails'))

      expect(tree.toJSON()).toMatchSnapshot()
    })
  })
})
