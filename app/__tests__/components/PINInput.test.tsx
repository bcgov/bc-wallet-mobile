import { testIdWithKey } from '@bifold/core'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { BasicAppContext } from '../../__mocks__/helpers/app'
import { PINInput } from '../../src/bcsc-theme/components/PINInput'

describe('PINInput', () => {
  const mockOnPINChange = jest.fn()
  const mockOnPINComplete = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Snapshot', () => {
    it('renders correctly without error message', () => {
      const tree = render(
        <BasicAppContext>
          <PINInput />
        </BasicAppContext>
      )
      expect(tree).toMatchSnapshot()
    })

    it('renders correctly with error message', () => {
      const tree = render(
        <BasicAppContext>
          <PINInput errorMessage="Incorrect PIN" />
        </BasicAppContext>
      )
      expect(tree).toMatchSnapshot()
    })

    it('renders correctly with autoFocus', () => {
      const tree = render(
        <BasicAppContext>
          <PINInput autoFocus />
        </BasicAppContext>
      )
      expect(tree).toMatchSnapshot()
    })
  })

  describe('PIN Input Behavior', () => {
    it('allows numeric input only', () => {
      const { getByA11yHint } = render(
        <BasicAppContext>
          <PINInput onPINChange={mockOnPINChange} />
        </BasicAppContext>
      )

      const input = getByA11yHint('Enter your 6-digit PIN')

      fireEvent.changeText(input, 'abc123def456')

      expect(mockOnPINChange).toHaveBeenCalledWith('123456')
    })

    it('limits input to 6 digits', () => {
      const { getByA11yHint } = render(
        <BasicAppContext>
          <PINInput onPINChange={mockOnPINChange} />
        </BasicAppContext>
      )

      const input = getByA11yHint('Enter your 6-digit PIN')

      fireEvent.changeText(input, '123456789')

      expect(mockOnPINChange).toHaveBeenCalledWith('123456')
    })

    it('calls onPINChange callback on every input change', () => {
      const { getByA11yHint } = render(
        <BasicAppContext>
          <PINInput onPINChange={mockOnPINChange} />
        </BasicAppContext>
      )

      const input = getByA11yHint('Enter your 6-digit PIN')

      fireEvent.changeText(input, '1')
      expect(mockOnPINChange).toHaveBeenCalledWith('1')

      fireEvent.changeText(input, '12')
      expect(mockOnPINChange).toHaveBeenCalledWith('12')

      fireEvent.changeText(input, '123')
      expect(mockOnPINChange).toHaveBeenCalledWith('123')
    })

    it('calls onPINComplete callback when 6 digits are entered', () => {
      const { getByA11yHint } = render(
        <BasicAppContext>
          <PINInput onPINChange={mockOnPINChange} onPINComplete={mockOnPINComplete} />
        </BasicAppContext>
      )

      const input = getByA11yHint('Enter your 6-digit PIN')

      fireEvent.changeText(input, '12345')
      expect(mockOnPINComplete).not.toHaveBeenCalled()

      fireEvent.changeText(input, '123456')
      expect(mockOnPINComplete).toHaveBeenCalledWith('123456')
    })

    it('does not call onPINComplete for less than 6 digits', () => {
      const { getByA11yHint } = render(
        <BasicAppContext>
          <PINInput onPINComplete={mockOnPINComplete} />
        </BasicAppContext>
      )

      const input = getByA11yHint('Enter your 6-digit PIN')

      fireEvent.changeText(input, '12345')

      expect(mockOnPINComplete).not.toHaveBeenCalled()
    })
  })

  describe('Visibility Toggle', () => {
    it('toggles PIN visibility when eye icon is pressed', () => {
      const { getByA11yHint, getByTestId } = render(
        <BasicAppContext>
          <PINInput />
        </BasicAppContext>
      )

      const input = getByA11yHint('Enter your 6-digit PIN')
      const visibilityButton = getByTestId(testIdWithKey('VisibilityButton'))

      // Initially secure (hidden)
      expect(input.props.secureTextEntry).toBe(true)

      // Press to show PIN
      fireEvent.press(visibilityButton)

      // Should now be visible
      expect(input.props.secureTextEntry).toBe(false)

      // Press again to hide
      fireEvent.press(visibilityButton)

      // Should be hidden again
      expect(input.props.secureTextEntry).toBe(true)
    })

    it('has correct accessibility labels for visibility states', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <PINInput />
        </BasicAppContext>
      )

      const visibilityButton = getByTestId(testIdWithKey('VisibilityButton'))

      // Initially shows "Show PIN"
      expect(visibilityButton.props.accessibilityLabel).toBe('Show PIN')

      // After pressing, shows "Hide PIN"
      fireEvent.press(visibilityButton)
      expect(visibilityButton.props.accessibilityLabel).toBe('Hide PIN')
    })
  })

  describe('Error Message', () => {
    it('displays error message when provided', () => {
      const { getByText } = render(
        <BasicAppContext>
          <PINInput errorMessage="Incorrect PIN" />
        </BasicAppContext>
      )

      expect(getByText('Incorrect PIN')).toBeTruthy()
    })

    it('does not display error message when not provided', () => {
      const { queryByText } = render(
        <BasicAppContext>
          <PINInput />
        </BasicAppContext>
      )

      // Should not display any error text
      expect(queryByText('Incorrect PIN')).toBeNull()
    })
  })

  describe('Accessibility', () => {
    it('has correct accessibility properties', () => {
      const { getByA11yHint } = render(
        <BasicAppContext>
          <PINInput />
        </BasicAppContext>
      )

      const input = getByA11yHint('Enter your 6-digit PIN')

      expect(input.props.accessibilityLabel).toBe('')
      expect(input.props.accessibilityHint).toBe('Enter your 6-digit PIN')
    })

    it('updates accessibility label with entered digits', () => {
      const { getByA11yHint } = render(
        <BasicAppContext>
          <PINInput />
        </BasicAppContext>
      )

      const input = getByA11yHint('Enter your 6-digit PIN')

      fireEvent.changeText(input, '123')

      // Accessibility label should space out the digits for screen readers
      expect(input.props.accessibilityLabel).toBe('1 2 3')
    })
  })
})
