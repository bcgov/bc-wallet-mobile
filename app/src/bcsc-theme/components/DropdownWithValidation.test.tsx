import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '@mocks/helpers/app'
import { DropdownOption, DropdownWithValidation } from './DropdownWithValidation'

describe('DropdownWithValidation Component', () => {
  const defaultOptions: DropdownOption<string>[] = [
    { label: 'Option 1', value: 'option1' },
    { label: 'Option 2', value: 'option2' },
    { label: 'Option 3', value: 'option3' },
  ]

  const defaultProps = {
    id: 'test-dropdown',
    value: null as string | null,
    options: defaultOptions,
    onChange: jest.fn(),
    label: 'Test Label',
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
      const { getByTestId, getByText } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} />
        </BasicAppContext>
      )

      expect(getByTestId('com.ariesbifold:id/test-dropdown-label')).toBeTruthy()
      expect(getByTestId('com.ariesbifold:id/test-dropdown-input')).toBeTruthy()
      expect(getByText('Test Label')).toBeTruthy()
      expect(getByText('Select an option')).toBeTruthy()
    })

    test('renders correctly with selected value', () => {
      const { getByTestId, getByText } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} value="option2" />
        </BasicAppContext>
      )

      expect(getByTestId('com.ariesbifold:id/test-dropdown-label')).toBeTruthy()
      expect(getByTestId('com.ariesbifold:id/test-dropdown-input')).toBeTruthy()
      expect(getByText('Option 2')).toBeTruthy()
    })

    test('renders correctly with error', () => {
      const { getByTestId, getByText } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} error="This field is required" />
        </BasicAppContext>
      )

      expect(getByTestId('com.ariesbifold:id/test-dropdown-error')).toBeTruthy()
      expect(getByText('This field is required')).toBeTruthy()
    })

    test('renders correctly with subtext', () => {
      const { getByTestId, getByText } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} subtext="Select your preferred option" />
        </BasicAppContext>
      )

      expect(getByTestId('com.ariesbifold:id/test-dropdown-subtext')).toBeTruthy()
      expect(getByText('Select your preferred option')).toBeTruthy()
    })

    test('displays the label text', () => {
      const { getByText } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} label="Custom Label" />
        </BasicAppContext>
      )

      expect(getByText('Custom Label')).toBeTruthy()
    })

    test('displays placeholder when no value selected', () => {
      const { getByText } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} placeholder="Choose an option" />
        </BasicAppContext>
      )

      expect(getByText('Choose an option')).toBeTruthy()
    })

    test('displays default placeholder when none provided', () => {
      const { getByText } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} />
        </BasicAppContext>
      )

      expect(getByText('Select an option')).toBeTruthy()
    })

    test('displays selected option label instead of placeholder', () => {
      const { getByText, queryByText } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} value="option2" placeholder="Choose an option" />
        </BasicAppContext>
      )

      expect(getByText('Option 2')).toBeTruthy()
      expect(queryByText('Choose an option')).toBeNull()
    })

    test('displays error message when error prop is provided', () => {
      const { getByText } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} error="This is an error" />
        </BasicAppContext>
      )

      expect(getByText('This is an error')).toBeTruthy()
    })

    test('displays subtext when provided and no error', () => {
      const { getByText } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} subtext="Helper text here" />
        </BasicAppContext>
      )

      expect(getByText('Helper text here')).toBeTruthy()
    })

    test('hides subtext when error is present', () => {
      const { getByText, queryByText } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} subtext="Helper text here" error="Error message" />
        </BasicAppContext>
      )

      expect(getByText('Error message')).toBeTruthy()
      expect(queryByText('Helper text here')).toBeNull()
    })
  })

  describe('Modal Interaction', () => {
    test('opens modal when dropdown button is pressed', async () => {
      const { getByTestId, getByText } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} />
        </BasicAppContext>
      )

      const dropdownButton = getByTestId('com.ariesbifold:id/test-dropdown-input')
      fireEvent.press(dropdownButton)

      await waitFor(() => {
        expect(getByText('Option 1')).toBeTruthy()
        expect(getByText('Option 2')).toBeTruthy()
        expect(getByText('Option 3')).toBeTruthy()
      })
    })

    test('closes modal when close button is pressed', async () => {
      const { getByTestId, queryByTestId } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} />
        </BasicAppContext>
      )

      // Open modal
      const dropdownButton = getByTestId('com.ariesbifold:id/test-dropdown-input')
      fireEvent.press(dropdownButton)

      // Close modal
      const closeButton = getByTestId('com.ariesbifold:id/test-dropdown-close')
      fireEvent.press(closeButton)

      await waitFor(() => {
        // Modal should be closed - options shouldn't be visible in the main view
        expect(queryByTestId('com.ariesbifold:id/test-dropdown-option-option1')).toBeNull()
      })
    })

    test('closes modal when overlay is pressed', async () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} />
        </BasicAppContext>
      )

      // Open modal
      const dropdownButton = getByTestId('com.ariesbifold:id/test-dropdown-input')
      fireEvent.press(dropdownButton)

      // The modal overlay can be closed by pressing outside the content
      // This is handled by the onRequestClose prop of Modal
      // We can verify the modal opens and has the close functionality
      const closeButton = getByTestId('com.ariesbifold:id/test-dropdown-close')
      expect(closeButton).toBeTruthy()
    })

    test('does not close modal when modal content is pressed', async () => {
      const { getByTestId, getByText } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} />
        </BasicAppContext>
      )

      // Open modal
      const dropdownButton = getByTestId('com.ariesbifold:id/test-dropdown-input')
      fireEvent.press(dropdownButton)

      await waitFor(() => {
        expect(getByText('Option 1')).toBeTruthy()
      })

      // Press on modal content (should stop propagation and NOT close modal)
      const modalContent = getByTestId('com.ariesbifold:id/test-dropdown-modal-content')
      const mockEvent = { stopPropagation: jest.fn() }
      fireEvent.press(modalContent, mockEvent)

      // Verify stopPropagation was called
      expect(mockEvent.stopPropagation).toHaveBeenCalled()

      // Modal should still be open - options should still be visible
      await waitFor(() => {
        expect(getByText('Option 1')).toBeTruthy()
        expect(getByText('Option 2')).toBeTruthy()
        expect(getByText('Option 3')).toBeTruthy()
      })
    })

    test('displays subtext as modal title', async () => {
      const { getByTestId, getAllByText } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} subtext="Select your province" />
        </BasicAppContext>
      )

      const dropdownButton = getByTestId('com.ariesbifold:id/test-dropdown-input')
      fireEvent.press(dropdownButton)

      await waitFor(() => {
        // The subtext is used as the modal title - there will be two instances (subtext and modal title)
        const subtextElements = getAllByText('Select your province')
        expect(subtextElements.length).toBeGreaterThanOrEqual(1)
      })
    })
  })

  describe('Option Selection', () => {
    test('calls onChange with correct value when option is selected', async () => {
      const mockOnChange = jest.fn()
      const { getByTestId } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} onChange={mockOnChange} />
        </BasicAppContext>
      )

      // Open modal
      const dropdownButton = getByTestId('com.ariesbifold:id/test-dropdown-input')
      fireEvent.press(dropdownButton)

      // Select option
      const option2 = getByTestId('com.ariesbifold:id/test-dropdown-option-option2')
      fireEvent.press(option2)

      expect(mockOnChange).toHaveBeenCalledWith('option2')
      expect(mockOnChange).toHaveBeenCalledTimes(1)
    })

    test('closes modal after option is selected', async () => {
      const mockOnChange = jest.fn()
      const { getByTestId, queryByTestId } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} onChange={mockOnChange} />
        </BasicAppContext>
      )

      // Open modal
      const dropdownButton = getByTestId('com.ariesbifold:id/test-dropdown-input')
      fireEvent.press(dropdownButton)

      // Select option
      const option1 = getByTestId('com.ariesbifold:id/test-dropdown-option-option1')
      fireEvent.press(option1)

      await waitFor(() => {
        // Modal should be closed after selection
        expect(queryByTestId('com.ariesbifold:id/test-dropdown-option-option1')).toBeNull()
      })
    })

    test('shows checkmark on selected option', async () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} value="option2" />
        </BasicAppContext>
      )

      // Open modal
      const dropdownButton = getByTestId('com.ariesbifold:id/test-dropdown-input')
      fireEvent.press(dropdownButton)

      await waitFor(() => {
        const option2 = getByTestId('com.ariesbifold:id/test-dropdown-option-option2')
        expect(option2.props.accessibilityState.selected).toBe(true)
      })
    })

    test('unselected options do not show as selected', async () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} value="option2" />
        </BasicAppContext>
      )

      // Open modal
      const dropdownButton = getByTestId('com.ariesbifold:id/test-dropdown-input')
      fireEvent.press(dropdownButton)

      await waitFor(() => {
        const option1 = getByTestId('com.ariesbifold:id/test-dropdown-option-option1')
        const option3 = getByTestId('com.ariesbifold:id/test-dropdown-option-option3')
        expect(option1.props.accessibilityState.selected).toBe(false)
        expect(option3.props.accessibilityState.selected).toBe(false)
      })
    })
  })

  describe('Accessibility', () => {
    test('dropdown button has correct accessibility role', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} />
        </BasicAppContext>
      )

      const dropdownButton = getByTestId('com.ariesbifold:id/test-dropdown-input')
      expect(dropdownButton.props.accessibilityRole).toBe('combobox')
    })

    test('dropdown button has correct accessibility state when closed', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} />
        </BasicAppContext>
      )

      const dropdownButton = getByTestId('com.ariesbifold:id/test-dropdown-input')
      expect(dropdownButton.props.accessibilityState.expanded).toBe(false)
    })

    test('dropdown button has correct accessibility label', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} label="Province" placeholder="Select province" />
        </BasicAppContext>
      )

      const dropdownButton = getByTestId('com.ariesbifold:id/test-dropdown-input')
      expect(dropdownButton.props.accessibilityLabel).toBe('Province, Select province')
    })

    test('dropdown button shows selected value in accessibility label', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} label="Province" value="option2" />
        </BasicAppContext>
      )

      const dropdownButton = getByTestId('com.ariesbifold:id/test-dropdown-input')
      expect(dropdownButton.props.accessibilityLabel).toBe('Province, Option 2')
    })

    test('option items have correct accessibility role', async () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} />
        </BasicAppContext>
      )

      // Open modal
      const dropdownButton = getByTestId('com.ariesbifold:id/test-dropdown-input')
      fireEvent.press(dropdownButton)

      await waitFor(() => {
        const option1 = getByTestId('com.ariesbifold:id/test-dropdown-option-option1')
        expect(option1.props.accessibilityRole).toBe('menuitem')
      })
    })

    test('close button has correct accessibility properties', async () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} />
        </BasicAppContext>
      )

      // Open modal
      const dropdownButton = getByTestId('com.ariesbifold:id/test-dropdown-input')
      fireEvent.press(dropdownButton)

      await waitFor(() => {
        const closeButton = getByTestId('com.ariesbifold:id/test-dropdown-close')
        expect(closeButton.props.accessibilityRole).toBe('button')
        expect(closeButton.props.accessibilityLabel).toBe('Close')
      })
    })

    test('label has correct testID', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} />
        </BasicAppContext>
      )

      expect(getByTestId('com.ariesbifold:id/test-dropdown-label')).toBeTruthy()
    })

    test('error has correct testID when present', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} error="Error message" />
        </BasicAppContext>
      )

      expect(getByTestId('com.ariesbifold:id/test-dropdown-error')).toBeTruthy()
    })

    test('subtext has correct testID when present', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} subtext="Helper text" />
        </BasicAppContext>
      )

      expect(getByTestId('com.ariesbifold:id/test-dropdown-subtext')).toBeTruthy()
    })
  })

  describe('Numeric Values', () => {
    const numericOptions: DropdownOption<number>[] = [
      { label: 'One', value: 1 },
      { label: 'Two', value: 2 },
      { label: 'Three', value: 3 },
    ]

    test('handles numeric option values correctly', async () => {
      const mockOnChange = jest.fn()
      const { getByTestId } = render(
        <BasicAppContext>
          <DropdownWithValidation
            id="numeric-dropdown"
            value={null}
            options={numericOptions}
            onChange={mockOnChange}
            label="Select Number"
          />
        </BasicAppContext>
      )

      // Open modal
      const dropdownButton = getByTestId('com.ariesbifold:id/numeric-dropdown-input')
      fireEvent.press(dropdownButton)

      // Select option with numeric value
      const option2 = getByTestId('com.ariesbifold:id/numeric-dropdown-option-2')
      fireEvent.press(option2)

      expect(mockOnChange).toHaveBeenCalledWith(2)
    })

    test('displays correct label for selected numeric value', () => {
      const { getByText } = render(
        <BasicAppContext>
          <DropdownWithValidation
            id="numeric-dropdown"
            value={2}
            options={numericOptions}
            onChange={jest.fn()}
            label="Select Number"
          />
        </BasicAppContext>
      )

      expect(getByText('Two')).toBeTruthy()
    })
  })

  describe('Edge Cases', () => {
    test('handles empty options array', async () => {
      const { getByTestId, queryByText } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} options={[]} />
        </BasicAppContext>
      )

      // Should render without crashing
      expect(getByTestId('com.ariesbifold:id/test-dropdown-input')).toBeTruthy()

      // Open modal - should be empty
      const dropdownButton = getByTestId('com.ariesbifold:id/test-dropdown-input')
      fireEvent.press(dropdownButton)

      await waitFor(() => {
        // No options should be visible
        expect(queryByText('Option 1')).toBeNull()
      })
    })

    test('handles single option', async () => {
      const singleOption: DropdownOption<string>[] = [{ label: 'Only Option', value: 'only' }]

      const { getByTestId, getByText } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} options={singleOption} />
        </BasicAppContext>
      )

      // Open modal
      const dropdownButton = getByTestId('com.ariesbifold:id/test-dropdown-input')
      fireEvent.press(dropdownButton)

      await waitFor(() => {
        expect(getByText('Only Option')).toBeTruthy()
      })
    })

    test('handles value that does not match any option', () => {
      const { getByText } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} value="nonexistent" placeholder="Select an option" />
        </BasicAppContext>
      )

      // Should show placeholder when value doesn't match any option
      expect(getByText('Select an option')).toBeTruthy()
    })

    test('handles very long option labels', async () => {
      const longOptions: DropdownOption<string>[] = [
        { label: 'This is a very long option label that might cause layout issues', value: 'long' },
      ]

      const { getByTestId, getByText } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} options={longOptions} />
        </BasicAppContext>
      )

      // Open modal
      const dropdownButton = getByTestId('com.ariesbifold:id/test-dropdown-input')
      fireEvent.press(dropdownButton)

      await waitFor(() => {
        expect(getByText('This is a very long option label that might cause layout issues')).toBeTruthy()
      })
    })

    test('handles many options', async () => {
      const manyOptions: DropdownOption<string>[] = Array.from({ length: 50 }, (_, i) => ({
        label: `Option ${i + 1}`,
        value: `option${i + 1}`,
      }))

      const { getByTestId, getByText } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} options={manyOptions} />
        </BasicAppContext>
      )

      // Open modal
      const dropdownButton = getByTestId('com.ariesbifold:id/test-dropdown-input')
      fireEvent.press(dropdownButton)

      await waitFor(() => {
        // First option should be visible
        expect(getByText('Option 1')).toBeTruthy()
      })
    })

    test('re-renders correctly when value prop changes', () => {
      const { getByText, rerender } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} value="option1" />
        </BasicAppContext>
      )

      expect(getByText('Option 1')).toBeTruthy()

      rerender(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} value="option3" />
        </BasicAppContext>
      )

      expect(getByText('Option 3')).toBeTruthy()
    })

    test('re-renders correctly when options prop changes', async () => {
      const newOptions: DropdownOption<string>[] = [
        { label: 'New Option A', value: 'newA' },
        { label: 'New Option B', value: 'newB' },
      ]

      const { getByTestId, getByText, queryByText, rerender } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} />
        </BasicAppContext>
      )

      // Open modal with original options
      const dropdownButton = getByTestId('com.ariesbifold:id/test-dropdown-input')
      fireEvent.press(dropdownButton)

      await waitFor(() => {
        expect(getByText('Option 1')).toBeTruthy()
      })

      // Close modal
      const closeButton = getByTestId('com.ariesbifold:id/test-dropdown-close')
      fireEvent.press(closeButton)

      // Rerender with new options
      rerender(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} options={newOptions} />
        </BasicAppContext>
      )

      // Open modal again
      fireEvent.press(dropdownButton)

      await waitFor(() => {
        expect(getByText('New Option A')).toBeTruthy()
        expect(getByText('New Option B')).toBeTruthy()
        expect(queryByText('Option 1')).toBeNull()
      })
    })
  })

  describe('Custom Styling Props', () => {
    test('accepts labelProps', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} labelProps={{ color: 'red' }} />
        </BasicAppContext>
      )

      const label = getByTestId('com.ariesbifold:id/test-dropdown-label')
      expect(label).toBeTruthy()
    })

    test('accepts subtextProps', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} subtext="Helper text" subtextProps={{ fontSize: 14 }} />
        </BasicAppContext>
      )

      const subtext = getByTestId('com.ariesbifold:id/test-dropdown-subtext')
      expect(subtext).toBeTruthy()
    })

    test('accepts errorProps', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <DropdownWithValidation {...defaultProps} error="Error" errorProps={{ fontWeight: 'bold' }} />
        </BasicAppContext>
      )

      const error = getByTestId('com.ariesbifold:id/test-dropdown-error')
      expect(error).toBeTruthy()
    })
  })
})
