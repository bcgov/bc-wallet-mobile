import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '../../../__mocks__/helpers/app'
import { RadioButton } from '../../../src/bcsc-theme/components/RadioButton'

describe('RadioButton Component', () => {
  const defaultProps = {
    label: 'Test Option',
    value: 'test-value',
    selected: false,
    onPress: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    test('renders correctly when unselected', () => {
      const tree = render(
        <BasicAppContext>
          <RadioButton {...defaultProps} />
        </BasicAppContext>
      )

      waitFor(() => {
        expect(tree).toMatchSnapshot()
      })
    })

    test('renders correctly when selected', () => {
      const tree = render(
        <BasicAppContext>
          <RadioButton {...defaultProps} selected={true} />
        </BasicAppContext>
      )

      waitFor(() => {
        expect(tree).toMatchSnapshot()
      })
    })

    test('renders correctly when disabled', () => {
      const tree = render(
        <BasicAppContext>
          <RadioButton {...defaultProps} disabled={true} />
        </BasicAppContext>
      )

      waitFor(() => {
        expect(tree).toMatchSnapshot()
      })
    })

    test('renders correctly when selected and disabled', () => {
      const tree = render(
        <BasicAppContext>
          <RadioButton {...defaultProps} selected={true} disabled={true} />
        </BasicAppContext>
      )

      waitFor(() => {
        expect(tree).toMatchSnapshot()
      })
    })

    test('displays the correct label text', () => {
      const { getByText } = render(
        <BasicAppContext>
          <RadioButton {...defaultProps} label="Custom Label" />
        </BasicAppContext>
      )

      expect(getByText('Custom Label')).toBeTruthy()
    })
  })

  describe('Interaction', () => {
    test('calls onPress with correct value when pressed', () => {
      const mockOnPress = jest.fn()
      const { getByRole } = render(
        <BasicAppContext>
          <RadioButton {...defaultProps} onPress={mockOnPress} />
        </BasicAppContext>
      )

      const radioButton = getByRole('radio')
      fireEvent.press(radioButton)

      expect(mockOnPress).toHaveBeenCalledWith('test-value')
      expect(mockOnPress).toHaveBeenCalledTimes(1)
    })

    test('does not call onPress when disabled', () => {
      const mockOnPress = jest.fn()
      const { getByRole } = render(
        <BasicAppContext>
          <RadioButton {...defaultProps} onPress={mockOnPress} disabled={true} />
        </BasicAppContext>
      )

      const radioButton = getByRole('radio')
      fireEvent.press(radioButton)

      expect(mockOnPress).not.toHaveBeenCalled()
    })

    test('calls onPress multiple times for multiple presses', () => {
      const mockOnPress = jest.fn()
      const { getByRole } = render(
        <BasicAppContext>
          <RadioButton {...defaultProps} onPress={mockOnPress} />
        </BasicAppContext>
      )

      const radioButton = getByRole('radio')
      fireEvent.press(radioButton)
      fireEvent.press(radioButton)
      fireEvent.press(radioButton)

      expect(mockOnPress).toHaveBeenCalledTimes(3)
    })
  })

  describe('Accessibility', () => {
    test('has correct accessibility role', () => {
      const { getByRole } = render(
        <BasicAppContext>
          <RadioButton {...defaultProps} />
        </BasicAppContext>
      )

      expect(getByRole('radio')).toBeTruthy()
    })

    test('has correct accessibility state when unselected', () => {
      const { getByRole } = render(
        <BasicAppContext>
          <RadioButton {...defaultProps} selected={false} />
        </BasicAppContext>
      )

      const radioButton = getByRole('radio')
      expect(radioButton.props.accessibilityState.selected).toBe(false)
    })

    test('has correct accessibility state when selected', () => {
      const { getByRole } = render(
        <BasicAppContext>
          <RadioButton {...defaultProps} selected={true} />
        </BasicAppContext>
      )

      const radioButton = getByRole('radio')
      expect(radioButton.props.accessibilityState.selected).toBe(true)
    })

    test('has correct accessibility state when disabled', () => {
      const { getByRole } = render(
        <BasicAppContext>
          <RadioButton {...defaultProps} disabled={true} />
        </BasicAppContext>
      )

      const radioButton = getByRole('radio')
      expect(radioButton.props.accessibilityState.disabled).toBe(true)
    })

    test('has correct accessibility label', () => {
      const { getByRole } = render(
        <BasicAppContext>
          <RadioButton {...defaultProps} label="Accessibility Label" />
        </BasicAppContext>
      )

      const radioButton = getByRole('radio')
      expect(radioButton.props.accessibilityLabel).toBe('Accessibility Label')
    })

    test('has correct testID when provided', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <RadioButton {...defaultProps} testID="custom-test-id" />
        </BasicAppContext>
      )

      expect(getByTestId('custom-test-id')).toBeTruthy()
    })
  })
})
