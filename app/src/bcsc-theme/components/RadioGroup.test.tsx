import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '@mocks/helpers/app'
import { RadioGroup } from './RadioGroup'

describe('RadioGroup Component', () => {
  const defaultOptions = [
    { label: 'Option 1', value: 'option1' },
    { label: 'Option 2', value: 'option2' },
    { label: 'Option 3', value: 'option3' },
  ]

  const defaultProps = {
    options: defaultOptions,
    onValueChange: jest.fn(),
    testID: 'test-radio-group',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Rendering', () => {
    test('renders correctly with default props', () => {
      const tree = render(
        <BasicAppContext>
          <RadioGroup {...defaultProps} />
        </BasicAppContext>
      )

      waitFor(() => {
        expect(tree).toMatchSnapshot()
      })
    })

    test('renders correctly with selected value', () => {
      const tree = render(
        <BasicAppContext>
          <RadioGroup {...defaultProps} selectedValue="option2" />
        </BasicAppContext>
      )

      waitFor(() => {
        expect(tree).toMatchSnapshot()
      })
    })

    test('renders correctly with mixed disabled options', () => {
      const optionsWithDisabled = [
        { label: 'Option 1', value: 'option1' },
        { label: 'Option 2 (Disabled)', value: 'option2', disabled: true },
        { label: 'Option 3', value: 'option3' },
      ]

      const tree = render(
        <BasicAppContext>
          <RadioGroup {...defaultProps} options={optionsWithDisabled} />
        </BasicAppContext>
      )

      waitFor(() => {
        expect(tree).toMatchSnapshot()
      })
    })

    test('displays all option labels', () => {
      const { getByText } = render(
        <BasicAppContext>
          <RadioGroup {...defaultProps} />
        </BasicAppContext>
      )

      expect(getByText('Option 1')).toBeTruthy()
      expect(getByText('Option 2')).toBeTruthy()
      expect(getByText('Option 3')).toBeTruthy()
    })
  })

  describe('Interaction', () => {
    test('calls onValueChange when an option is selected', () => {
      const mockOnValueChange = jest.fn()
      const { getByText } = render(
        <BasicAppContext>
          <RadioGroup {...defaultProps} onValueChange={mockOnValueChange} />
        </BasicAppContext>
      )

      fireEvent.press(getByText('Option 2'))

      expect(mockOnValueChange).toHaveBeenCalledWith('option2')
      expect(mockOnValueChange).toHaveBeenCalledTimes(1)
    })

    test('calls onValueChange with correct value for each option', () => {
      const mockOnValueChange = jest.fn()
      const { getByText } = render(
        <BasicAppContext>
          <RadioGroup {...defaultProps} onValueChange={mockOnValueChange} />
        </BasicAppContext>
      )

      fireEvent.press(getByText('Option 1'))
      expect(mockOnValueChange).toHaveBeenCalledWith('option1')

      fireEvent.press(getByText('Option 3'))
      expect(mockOnValueChange).toHaveBeenCalledWith('option3')

      expect(mockOnValueChange).toHaveBeenCalledTimes(2)
    })

    test('does not call onValueChange for individually disabled options', () => {
      const mockOnValueChange = jest.fn()
      const optionsWithDisabled = [
        { label: 'Option 1', value: 'option1' },
        { label: 'Option 2', value: 'option2', disabled: true },
        { label: 'Option 3', value: 'option3' },
      ]

      const { getByText } = render(
        <BasicAppContext>
          <RadioGroup {...defaultProps} options={optionsWithDisabled} onValueChange={mockOnValueChange} />
        </BasicAppContext>
      )

      // Press enabled option - should work
      fireEvent.press(getByText('Option 1'))
      expect(mockOnValueChange).toHaveBeenCalledWith('option1')

      // Press disabled option - should not work
      fireEvent.press(getByText('Option 2'))
      expect(mockOnValueChange).toHaveBeenCalledTimes(1) // Still just the first call

      // Press another enabled option - should work
      fireEvent.press(getByText('Option 3'))
      expect(mockOnValueChange).toHaveBeenCalledWith('option3')
      expect(mockOnValueChange).toHaveBeenCalledTimes(2)
    })
  })

  describe('Accessibility Selection State', () => {
    test('shows correct selection state for each option', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <RadioGroup {...defaultProps} selectedValue="option2" />
        </BasicAppContext>
      )

      // Check that the correct option shows as selected via accessibility state
      const option1 = getByTestId('test-radio-group-option-Option1')
      const option2 = getByTestId('test-radio-group-option-Option2')
      const option3 = getByTestId('test-radio-group-option-Option3')

      expect(option1.props.accessibilityState.selected).toBe(false)
      expect(option2.props.accessibilityState.selected).toBe(true)
      expect(option3.props.accessibilityState.selected).toBe(false)
    })

    test('updates selection state when value changes', () => {
      const mockOnValueChange = jest.fn()
      let selectedValue = 'option1'

      const onValueChange = (value: string) => {
        selectedValue = value
        mockOnValueChange(value)
      }

      const TestComponent = () => (
        <BasicAppContext>
          <RadioGroup {...defaultProps} selectedValue={selectedValue} onValueChange={onValueChange} />
        </BasicAppContext>
      )

      const { getByText, getByTestId, rerender } = render(<TestComponent />)

      // Initially option1 should be selected
      expect(getByTestId('test-radio-group-option-Option1').props.accessibilityState.selected).toBe(true)

      // Select option2
      fireEvent.press(getByText('Option 2'))

      // Re-render with new selected value
      selectedValue = 'option2'
      rerender(<TestComponent />)

      expect(getByTestId('test-radio-group-option-Option2').props.accessibilityState.selected).toBe(true)
      expect(getByTestId('test-radio-group-option-Option1').props.accessibilityState.selected).toBe(false)
    })
  })

  describe('Accessibility', () => {
    test('has correct testID when provided', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <RadioGroup {...defaultProps} testID="custom-radio-group" />
        </BasicAppContext>
      )

      expect(getByTestId('custom-radio-group')).toBeTruthy()
    })

    test('generates correct testIDs for individual options', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <RadioGroup {...defaultProps} testID="test-group" />
        </BasicAppContext>
      )

      expect(getByTestId('test-group-option-Option1')).toBeTruthy()
      expect(getByTestId('test-group-option-Option2')).toBeTruthy()
      expect(getByTestId('test-group-option-Option3')).toBeTruthy()
    })
  })

  describe('Edge Cases', () => {
    test('handles empty options array', () => {
      const tree = render(
        <BasicAppContext>
          <RadioGroup {...defaultProps} options={[]} />
        </BasicAppContext>
      )

      waitFor(() => {
        expect(tree).toMatchSnapshot()
      })
    })

    test('handles single option', () => {
      const singleOption = [{ label: 'Only Option', value: 'only' }]

      const tree = render(
        <BasicAppContext>
          <RadioGroup {...defaultProps} options={singleOption} />
        </BasicAppContext>
      )

      waitFor(() => {
        expect(tree).toMatchSnapshot()
      })
    })

    test('handles selectedValue that does not match any option', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <RadioGroup {...defaultProps} selectedValue="nonexistent" />
        </BasicAppContext>
      )

      // All options should be unselected
      expect(getByTestId('test-radio-group-option-Option1').props.accessibilityState.selected).toBe(false)
      expect(getByTestId('test-radio-group-option-Option2').props.accessibilityState.selected).toBe(false)
      expect(getByTestId('test-radio-group-option-Option3').props.accessibilityState.selected).toBe(false)
    })
  })
})
