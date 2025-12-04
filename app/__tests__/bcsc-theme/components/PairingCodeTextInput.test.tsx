import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '../../../__mocks__/helpers/app'
import PairingCodeTextInput from '../../../src/bcsc-theme/features/pairing/components/PairingCodeTextInput'

describe('PairingCodeTextInput Component', () => {
  const defaultProps = {
    handleChangeCode: jest.fn(),
    testID: 'pairing-code-input',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Rendering', () => {
    test('renders correctly', () => {
      const tree = render(
        <BasicAppContext>
          <PairingCodeTextInput {...defaultProps} />
        </BasicAppContext>
      )

      waitFor(() => {
        expect(tree).toMatchSnapshot()
      })
    })

    test('renders with correct initial state', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <PairingCodeTextInput {...defaultProps} />
        </BasicAppContext>
      )

      const input = getByTestId('pairing-code-input')
      expect(input.props.value).toBe('')
      expect(input.props.maxLength).toBe(7)
    })
  })

  describe('Input Formatting', () => {
    test('converts lowercase to uppercase', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <PairingCodeTextInput {...defaultProps} />
        </BasicAppContext>
      )

      const input = getByTestId('pairing-code-input')
      fireEvent.changeText(input, 'abc')

      expect(input.props.value).toBe('ABC')
      expect(defaultProps.handleChangeCode).toHaveBeenCalledWith('ABC')
    })

    test('adds space after 3 characters', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <PairingCodeTextInput {...defaultProps} />
        </BasicAppContext>
      )

      const input = getByTestId('pairing-code-input')
      fireEvent.changeText(input, 'ABCD')

      expect(input.props.value).toBe('ABC D')
      expect(defaultProps.handleChangeCode).toHaveBeenCalledWith('ABCD')
    })

    test('maintains space formatting with full 6-character input', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <PairingCodeTextInput {...defaultProps} />
        </BasicAppContext>
      )

      const input = getByTestId('pairing-code-input')
      fireEvent.changeText(input, 'ABCDEF')

      expect(input.props.value).toBe('ABC DEF')
      expect(defaultProps.handleChangeCode).toHaveBeenCalledWith('ABCDEF')
    })

    test('removes existing spaces from input', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <PairingCodeTextInput {...defaultProps} />
        </BasicAppContext>
      )

      const input = getByTestId('pairing-code-input')
      fireEvent.changeText(input, 'AB C D')

      expect(input.props.value).toBe('ABC D')
      expect(defaultProps.handleChangeCode).toHaveBeenCalledWith('ABCD')
    })

    test('limits input to 6 characters maximum', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <PairingCodeTextInput {...defaultProps} />
        </BasicAppContext>
      )

      const input = getByTestId('pairing-code-input')
      fireEvent.changeText(input, 'ABCDEFGHIJ')

      expect(input.props.value).toBe('ABC DEF')
      expect(defaultProps.handleChangeCode).toHaveBeenCalledWith('ABCDEF')
    })
  })

  describe('Backspace Behavior', () => {
    test('handles backspace when input has 3 characters (before space)', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <PairingCodeTextInput {...defaultProps} />
        </BasicAppContext>
      )

      const input = getByTestId('pairing-code-input')

      fireEvent.changeText(input, 'ABC')
      expect(input.props.value).toBe('ABC')

      fireEvent.changeText(input, 'AB')
      expect(input.props.value).toBe('AB')
      expect(defaultProps.handleChangeCode).toHaveBeenLastCalledWith('AB')
    })

    test('handles backspace when input has 4 characters (after space)', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <PairingCodeTextInput {...defaultProps} />
        </BasicAppContext>
      )

      const input = getByTestId('pairing-code-input')

      fireEvent.changeText(input, 'ABCD')
      expect(input.props.value).toBe('ABC D')

      fireEvent.changeText(input, 'ABC')
      expect(input.props.value).toBe('ABC')
      expect(defaultProps.handleChangeCode).toHaveBeenLastCalledWith('ABC')
    })

    test('handles backspace from full 6-character input', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <PairingCodeTextInput {...defaultProps} />
        </BasicAppContext>
      )

      const input = getByTestId('pairing-code-input')

      fireEvent.changeText(input, 'ABCDEF')
      expect(input.props.value).toBe('ABC DEF')

      fireEvent.changeText(input, 'ABCDE')
      expect(input.props.value).toBe('ABC DE')
      expect(defaultProps.handleChangeCode).toHaveBeenLastCalledWith('ABCDE')
    })

    test('handles progressive backspacing through space boundary', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <PairingCodeTextInput {...defaultProps} />
        </BasicAppContext>
      )

      const input = getByTestId('pairing-code-input')

      fireEvent.changeText(input, 'ABCDE')
      expect(input.props.value).toBe('ABC DE')

      fireEvent.changeText(input, 'ABCD')
      expect(input.props.value).toBe('ABC D')

      // backspace to the space
      fireEvent.changeText(input, 'ABC ')
      expect(input.props.value).toBe('ABC')

      fireEvent.changeText(input, 'ABC')
      expect(input.props.value).toBe('ABC')

      fireEvent.changeText(input, 'AB')
      expect(input.props.value).toBe('AB')

      fireEvent.changeText(input, 'A')
      expect(input.props.value).toBe('A')

      fireEvent.changeText(input, '')
      expect(input.props.value).toBe('')
    })
  })

  describe('Edge Cases', () => {
    test('handles empty input', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <PairingCodeTextInput {...defaultProps} />
        </BasicAppContext>
      )

      const input = getByTestId('pairing-code-input')
      fireEvent.changeText(input, '')

      expect(input.props.value).toBe('')
      expect(defaultProps.handleChangeCode).toHaveBeenCalledWith('')
    })

    test('handles input with only spaces', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <PairingCodeTextInput {...defaultProps} />
        </BasicAppContext>
      )

      const input = getByTestId('pairing-code-input')
      fireEvent.changeText(input, '   ')

      expect(input.props.value).toBe('')
      expect(defaultProps.handleChangeCode).toHaveBeenCalledWith('')
    })

    test('handles mixed case input', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <PairingCodeTextInput {...defaultProps} />
        </BasicAppContext>
      )

      const input = getByTestId('pairing-code-input')
      fireEvent.changeText(input, 'aBcDeF')

      expect(input.props.value).toBe('ABC DEF')
      expect(defaultProps.handleChangeCode).toHaveBeenCalledWith('ABCDEF')
    })

    test('handles input with numbers and letters', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <PairingCodeTextInput {...defaultProps} />
        </BasicAppContext>
      )

      const input = getByTestId('pairing-code-input')
      fireEvent.changeText(input, 'A1B2C3')

      expect(input.props.value).toBe('A1B 2C3')
      expect(defaultProps.handleChangeCode).toHaveBeenCalledWith('A1B2C3')
    })
  })

  describe('Focus States', () => {
    test('handles focus and blur events', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <PairingCodeTextInput {...defaultProps} />
        </BasicAppContext>
      )

      const input = getByTestId('pairing-code-input')

      // Focus and blur states are handled internally, we just ensure no errors occur
      fireEvent(input, 'focus')
      fireEvent(input, 'blur')
    })
  })

  describe('Props Forwarding', () => {
    test('forwards additional TextInput props', () => {
      const additionalProps = {
        placeholder: 'Enter code',
        editable: false,
        accessibilityLabel: 'Pairing code input',
      }

      const { getByTestId } = render(
        <BasicAppContext>
          <PairingCodeTextInput {...defaultProps} {...additionalProps} />
        </BasicAppContext>
      )

      const input = getByTestId('pairing-code-input')
      expect(input.props.placeholder).toBe('Enter code')
      expect(input.props.editable).toBe(false)
      expect(input.props.accessibilityLabel).toBe('Pairing code input')
    })
  })

  describe('Callback Behavior', () => {
    test('calls handleChangeCode with clean values only', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <PairingCodeTextInput {...defaultProps} />
        </BasicAppContext>
      )

      const input = getByTestId('pairing-code-input')

      fireEvent.changeText(input, 'A')
      expect(defaultProps.handleChangeCode).toHaveBeenLastCalledWith('A')

      fireEvent.changeText(input, 'AB')
      expect(defaultProps.handleChangeCode).toHaveBeenLastCalledWith('AB')

      fireEvent.changeText(input, 'ABC')
      expect(defaultProps.handleChangeCode).toHaveBeenLastCalledWith('ABC')

      fireEvent.changeText(input, 'ABCD')
      expect(defaultProps.handleChangeCode).toHaveBeenLastCalledWith('ABCD')

      fireEvent.changeText(input, 'ABC DEF') // User somehow enters with space
      expect(defaultProps.handleChangeCode).toHaveBeenLastCalledWith('ABCDEF')

      fireEvent.changeText(input, 'ABCDEFGH') // User pastes too long input
      expect(defaultProps.handleChangeCode).toHaveBeenLastCalledWith('ABCDEF')
    })
  })
})
