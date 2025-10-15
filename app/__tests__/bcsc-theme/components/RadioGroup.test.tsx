import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '../../../__mocks__/helpers/app'
import { RadioGroup } from '../../../src/bcsc-theme/components/RadioGroup'

describe('RadioGroup Component', () => {
  const defaultOptions = [
    { label: 'Option 1', value: 'option1' },
    { label: 'Option 2', value: 'option2' },
    { label: 'Option 3', value: 'option3' },
  ]

  const defaultProps = {
    options: defaultOptions,
    onValueChange: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
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

    test('renders correctly with title', () => {
      const tree = render(
        <BasicAppContext>
          <RadioGroup {...defaultProps} title="Choose an option" />
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

    test('renders correctly when disabled', () => {
      const tree = render(
        <BasicAppContext>
          <RadioGroup {...defaultProps} disabled={true} />
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

    test('displays title when provided', () => {
      const { getByText } = render(
        <BasicAppContext>
          <RadioGroup {...defaultProps} title="Select your choice" />
        </BasicAppContext>
      )

      expect(getByText('Select your choice')).toBeTruthy()
    })

    test('does not display title when not provided', () => {
      const { queryByText } = render(
        <BasicAppContext>
          <RadioGroup {...defaultProps} />
        </BasicAppContext>
      )

      // Should not find any title text
      expect(queryByText('Select your choice')).toBeFalsy()
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

    test('does not call onValueChange when group is disabled', () => {
      const mockOnValueChange = jest.fn()
      const { getByText } = render(
        <BasicAppContext>
          <RadioGroup {...defaultProps} onValueChange={mockOnValueChange} disabled={true} />
        </BasicAppContext>
      )

      fireEvent.press(getByText('Option 1'))

      expect(mockOnValueChange).not.toHaveBeenCalled()
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
          <RadioGroup {...defaultProps} selectedValue="option2" testID="radio-group" />
        </BasicAppContext>
      )

      // Check that the correct option shows as selected via accessibility state
      const option1 = getByTestId('radio-group-option-option1')
      const option2 = getByTestId('radio-group-option-option2')
      const option3 = getByTestId('radio-group-option-option3')

      expect(option1.props.accessibilityState.selected).toBe(false)
      expect(option2.props.accessibilityState.selected).toBe(true)
      expect(option3.props.accessibilityState.selected).toBe(false)
    })

    test('updates selection state when value changes', () => {
      const mockOnValueChange = jest.fn()
      let selectedValue = 'option1'

      const TestComponent = () => (
        <BasicAppContext>
          <RadioGroup
            {...defaultProps}
            selectedValue={selectedValue}
            onValueChange={(value) => {
              selectedValue = value
              mockOnValueChange(value)
            }}
            testID="radio-group"
          />
        </BasicAppContext>
      )

      const { getByText, getByTestId, rerender } = render(<TestComponent />)

      // Initially option1 should be selected
      expect(getByTestId('radio-group-option-option1').props.accessibilityState.selected).toBe(true)

      // Select option2
      fireEvent.press(getByText('Option 2'))

      // Re-render with new selected value
      selectedValue = 'option2'
      rerender(<TestComponent />)

      expect(getByTestId('radio-group-option-option2').props.accessibilityState.selected).toBe(true)
      expect(getByTestId('radio-group-option-option1').props.accessibilityState.selected).toBe(false)
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

      expect(getByTestId('test-group-option-option1')).toBeTruthy()
      expect(getByTestId('test-group-option-option2')).toBeTruthy()
      expect(getByTestId('test-group-option-option3')).toBeTruthy()
    })

    test('uses default testID for options when no testID provided', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <RadioGroup {...defaultProps} />
        </BasicAppContext>
      )

      expect(getByTestId('radioGroup-option-option1')).toBeTruthy()
      expect(getByTestId('radioGroup-option-option2')).toBeTruthy()
      expect(getByTestId('radioGroup-option-option3')).toBeTruthy()
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
          <RadioGroup {...defaultProps} selectedValue="nonexistent" testID="radio-group" />
        </BasicAppContext>
      )

      // All options should be unselected
      expect(getByTestId('radio-group-option-option1').props.accessibilityState.selected).toBe(false)
      expect(getByTestId('radio-group-option-option2').props.accessibilityState.selected).toBe(false)
      expect(getByTestId('radio-group-option-option3').props.accessibilityState.selected).toBe(false)
    })
  })
})
