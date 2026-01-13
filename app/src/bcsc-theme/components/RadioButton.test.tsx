import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '@mocks/helpers/app'
import { RadioButton } from './RadioButton'

describe('RadioButton Component', () => {
  const defaultProps = {
    label: 'Test Option',
    value: false,
    selectedValue: undefined,
    onValueChange: jest.fn(),
    testID: 'default-test-id',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
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
          <RadioButton {...defaultProps} value={true} selectedValue={true} />
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
          <RadioButton {...defaultProps} selectedValue={false} disabled={true} />
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
    test('calls onValueChange with correct value when pressed', () => {
      const mockonValueChange = jest.fn()
      const { getByRole } = render(
        <BasicAppContext>
          <RadioButton {...defaultProps} onValueChange={mockonValueChange} />
        </BasicAppContext>
      )

      const radioButton = getByRole('radio')
      fireEvent.press(radioButton)

      expect(mockonValueChange).toHaveBeenCalledWith(false)
      expect(mockonValueChange).toHaveBeenCalledTimes(1)
    })

    test('does not call onValueChange when disabled', () => {
      const mockonValueChange = jest.fn()
      const { getByRole } = render(
        <BasicAppContext>
          <RadioButton {...defaultProps} onValueChange={mockonValueChange} disabled={true} />
        </BasicAppContext>
      )

      const radioButton = getByRole('radio')
      fireEvent.press(radioButton)

      expect(mockonValueChange).not.toHaveBeenCalled()
    })

    test('calls onValueChange multiple times for multiple presses', () => {
      const mockonValueChange = jest.fn()
      const { getByRole } = render(
        <BasicAppContext>
          <RadioButton {...defaultProps} onValueChange={mockonValueChange} />
        </BasicAppContext>
      )

      const radioButton = getByRole('radio')
      fireEvent.press(radioButton)
      fireEvent.press(radioButton)
      fireEvent.press(radioButton)

      expect(mockonValueChange).toHaveBeenCalledTimes(3)
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
          <RadioButton {...defaultProps} />
        </BasicAppContext>
      )

      const radioButton = getByRole('radio')
      expect(radioButton.props.accessibilityState.selected).toBe(false)
    })

    test('has correct accessibility state when selected', () => {
      const { getByRole } = render(
        <BasicAppContext>
          <RadioButton {...defaultProps} selectedValue={false} />
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
