import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, screen } from '@testing-library/react-native'
import React, { useState } from 'react'
import DateInput from './DateInput'

const defaultProps = {
  id: 'birthdate',
  label: 'Date of Birth',
  value: '',
  onChange: jest.fn(),
}

/** Controlled wrapper so we can test stateful typing behaviour */
const ControlledDateInput = ({ initialValue = '' }: { initialValue?: string }) => {
  const [value, setValue] = useState(initialValue)
  return (
    <BasicAppContext>
      <DateInput {...defaultProps} value={value} onChange={setValue} />
    </BasicAppContext>
  )
}

const renderDefault = (overrides: Partial<React.ComponentProps<typeof DateInput>> = {}) =>
  render(
    <BasicAppContext>
      <DateInput {...defaultProps} {...overrides} />
    </BasicAppContext>
  )

describe('DateInput Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Rendering', () => {
    test('renders correctly', () => {
      const tree = renderDefault()
      expect(tree).toMatchSnapshot()
    })

    test('renders the label', () => {
      renderDefault()
      expect(screen.getByText('Date of Birth')).toBeTruthy()
    })

    test('renders the input with correct test ID', () => {
      renderDefault()
      expect(screen.getByTestId(testIdWithKey('birthdate-input'))).toBeTruthy()
    })

    test('shows the error message when an error is provided', () => {
      renderDefault({ error: 'Invalid date' })
      expect(screen.getByText('Invalid date')).toBeTruthy()
    })

    test('shows the subtext when provided and no error', () => {
      renderDefault({ subtext: 'Enter your birthdate' })
      expect(screen.getByText('Enter your birthdate')).toBeTruthy()
    })

    test('does not show subtext when an error is also provided', () => {
      renderDefault({ error: 'Invalid date', subtext: 'Enter your birthdate' })
      expect(screen.queryByText('Enter your birthdate')).toBeNull()
    })

    test('does not show the error element when no error provided', () => {
      renderDefault()
      expect(screen.queryByTestId(testIdWithKey('birthdate-error'))).toBeNull()
    })
  })

  describe('Template overlay', () => {
    test('shows full YYYY/MM/DD template when input is empty', () => {
      renderDefault({ value: '' })
      expect(screen.getByText('YYYY/MM/DD')).toBeTruthy()
    })

    test('shows remaining template characters after entered digits', () => {
      renderDefault({ value: '199' })
      expect(screen.getByText('Y/MM/DD')).toBeTruthy()
    })

    test('shows MM/DD template after year is fully entered', () => {
      renderDefault({ value: '1985' })
      expect(screen.getByText('MM/DD')).toBeTruthy()
    })

    test('shows DD template after month is fully entered', () => {
      renderDefault({ value: '1985/03' })
      expect(screen.getByText('DD')).toBeTruthy()
    })

    test('shows no template characters when all digits are entered', () => {
      renderDefault({ value: '1985/03/14' })
      expect(screen.queryByText(/[Y]{4}|[M]{2}|[D]{2}/)).toBeNull()
    })
  })

  describe('Progressive reveal', () => {
    test('shows empty value when no digits are present', () => {
      renderDefault({ value: '' })
      const input = screen.getByTestId(testIdWithKey('birthdate-input'))
      expect(input.props.value).toBe('')
    })

    test('shows only the entered digits for a partial year', () => {
      renderDefault({ value: '1' })
      const input = screen.getByTestId(testIdWithKey('birthdate-input'))
      expect(input.props.value).toBe('1')
    })

    test('shows three digits without slashes', () => {
      renderDefault({ value: '198' })
      const input = screen.getByTestId(testIdWithKey('birthdate-input'))
      expect(input.props.value).toBe('198')
    })

    test('eagerly adds slash after 4 digits', () => {
      renderDefault({ value: '1985' })
      const input = screen.getByTestId(testIdWithKey('birthdate-input'))
      expect(input.props.value).toBe('1985/')
    })

    test('shows year and partial month', () => {
      renderDefault({ value: '1985/0' })
      const input = screen.getByTestId(testIdWithKey('birthdate-input'))
      expect(input.props.value).toBe('1985/0')
    })

    test('shows full date when 8 digits are entered', () => {
      renderDefault({ value: '1985/03/14' })
      const input = screen.getByTestId(testIdWithKey('birthdate-input'))
      expect(input.props.value).toBe('1985/03/14')
    })
  })

  describe('onChange values', () => {
    test('shows raw digits for a partial year input', () => {
      const onChange = jest.fn()
      renderDefault({ onChange })
      const input = screen.getByTestId(testIdWithKey('birthdate-input'))
      fireEvent.changeText(input, '19')
      expect(onChange).toHaveBeenCalledWith('19')
    })

    test('shows YYYY/MM/ format once 6 digits are entered', () => {
      const onChange = jest.fn()
      renderDefault({ onChange })
      const input = screen.getByTestId(testIdWithKey('birthdate-input'))
      fireEvent.changeText(input, '198503')
      expect(onChange).toHaveBeenCalledWith('1985/03/')
    })

    test('shows YYYY/MM/DD value once all 8 digits are present', () => {
      const onChange = jest.fn()
      renderDefault({ onChange })
      const input = screen.getByTestId(testIdWithKey('birthdate-input'))
      fireEvent.changeText(input, '19850314')
      expect(onChange).toHaveBeenCalledWith('1985/03/14')
    })

    test('strips non digit characters from raw input before emitting', () => {
      const onChange = jest.fn()
      renderDefault({ onChange })
      const input = screen.getByTestId(testIdWithKey('birthdate-input'))
      fireEvent.changeText(input, 'ab1985xy03')
      expect(onChange).toHaveBeenCalledWith('1985/03/')
    })

    test('clamps canonical value to 8 digits (YYYY/MM/DD)', () => {
      const onChange = jest.fn()
      renderDefault({ onChange })
      const input = screen.getByTestId(testIdWithKey('birthdate-input'))
      fireEvent.changeText(input, '1985031412345')
      expect(onChange).toHaveBeenCalledWith('1985/03/14')
    })
  })

  describe('Deleting digits', () => {
    test('removes the last digit when backspacing', async () => {
      const { rerender } = render(<ControlledDateInput initialValue="1985/03/14" />)

      const input = screen.getByTestId(testIdWithKey('birthdate-input'))
      fireEvent.changeText(input, '1985/03/1')

      rerender(<ControlledDateInput initialValue="1985/03/1" />)
      expect(screen.getByTestId(testIdWithKey('birthdate-input')).props.value).toBe('1985/03/1')
    })

    test('allows full removal back to an empty input', () => {
      const onChange = jest.fn()
      renderDefault({ value: '1', onChange })
      const input = screen.getByTestId(testIdWithKey('birthdate-input'))
      fireEvent.changeText(input, '')
      expect(onChange).toHaveBeenCalledWith('')
    })
  })
})
