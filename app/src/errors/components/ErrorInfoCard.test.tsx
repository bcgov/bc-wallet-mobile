import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { ErrorInfoCard, ErrorInfoCardColors, ErrorInfoCardProps, fallbackColors } from './ErrorInfoCard'

jest.mock('react-native-device-info', () => ({
  getVersion: () => '1.0.0',
  getBuildNumber: () => '42',
}))

jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon')

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

    it('should always show the Okay button', () => {
      const { getByTestId } = render(<ErrorInfoCard {...defaultProps} />)

      expect(getByTestId('com.aries.bifold:id/Okay')).toBeTruthy()
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

    it('should hide toggle after revealing details', () => {
      const { getByTestId, queryByTestId } = render(<ErrorInfoCard {...defaultProps} message="Tech msg" />)

      fireEvent.press(getByTestId('com.aries.bifold:id/ShowDetails'))

      expect(queryByTestId('com.aries.bifold:id/ShowDetails')).toBeNull()
    })
  })

  describe('dismiss button', () => {
    it('should call onDismiss when Okay is pressed', () => {
      const { getByTestId } = render(<ErrorInfoCard {...defaultProps} />)

      fireEvent.press(getByTestId('com.aries.bifold:id/Okay'))

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

  describe('colors', () => {
    it('should use fallback colors by default', () => {
      const { getByTestId } = render(<ErrorInfoCard {...defaultProps} />)

      expect(getByTestId('com.aries.bifold:id/HeaderText')).toBeTruthy()
    })

    it('should accept custom colors', () => {
      const customColors: ErrorInfoCardColors = {
        ...fallbackColors,
        text: '#FF0000',
        cardBackground: '#000000',
      }

      const { getByTestId } = render(<ErrorInfoCard {...defaultProps} colors={customColors} />)

      expect(getByTestId('com.aries.bifold:id/HeaderText')).toBeTruthy()
    })
  })
})
