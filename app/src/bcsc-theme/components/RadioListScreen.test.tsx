import { RadioListOption, RadioListScreen } from '@/bcsc-theme/components/RadioListScreen'
import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'

const options: RadioListOption[] = [
  { title: 'Five minutes', value: 5, testID: 'radio-5' },
  { title: 'Three minutes', value: 3, testID: 'radio-3' },
  { title: 'Never', value: 0, testID: 'radio-0' },
]

const renderScreen = (currentValue: number, onSelect: (value: number) => void = jest.fn()) =>
  render(
    <BasicAppContext>
      <RadioListScreen options={options} currentValue={currentValue} onSelect={onSelect} />
    </BasicAppContext>
  )

// The tappable element BouncyCheckbox renders is labelled with the option value
const checkbox = (utils: ReturnType<typeof renderScreen>, value: number) => utils.getByLabelText(String(value))

describe('RadioListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('rendering', () => {
    it('renders a row for every option', () => {
      const { getByText } = renderScreen(5)

      expect(getByText('Five minutes')).toBeTruthy()
      expect(getByText('Three minutes')).toBeTruthy()
      expect(getByText('Never')).toBeTruthy()
    })

    it('renders each option row with its keyed testID', () => {
      const { getByTestId } = renderScreen(5)

      expect(getByTestId(testIdWithKey('radio-5'))).toBeTruthy()
      expect(getByTestId(testIdWithKey('radio-3'))).toBeTruthy()
      expect(getByTestId(testIdWithKey('radio-0'))).toBeTruthy()
    })

    it('renders nothing to select when given an empty option list', () => {
      const { queryByText } = render(
        <BasicAppContext>
          <RadioListScreen options={[]} currentValue={5} onSelect={jest.fn()} />
        </BasicAppContext>
      )

      expect(queryByText('Five minutes')).toBeNull()
    })
  })

  describe('selection state', () => {
    it('marks only the row whose value matches currentValue as checked', () => {
      const utils = renderScreen(3)

      expect(checkbox(utils, 5).props.isChecked).toBe(false)
      expect(checkbox(utils, 3).props.isChecked).toBe(true)
      expect(checkbox(utils, 0).props.isChecked).toBe(false)
    })

    it('can mark the zero-valued row as checked', () => {
      const utils = renderScreen(0)

      expect(checkbox(utils, 0).props.isChecked).toBe(true)
      expect(checkbox(utils, 5).props.isChecked).toBe(false)
    })

    it('checks nothing when currentValue matches no option', () => {
      const utils = renderScreen(999)

      expect(checkbox(utils, 5).props.isChecked).toBe(false)
      expect(checkbox(utils, 3).props.isChecked).toBe(false)
      expect(checkbox(utils, 0).props.isChecked).toBe(false)
    })

    it('follows the currentValue prop rather than internal state on re-render', () => {
      const { rerender, getByLabelText } = render(
        <BasicAppContext>
          <RadioListScreen options={options} currentValue={5} onSelect={jest.fn()} />
        </BasicAppContext>
      )
      expect(getByLabelText('5').props.isChecked).toBe(true)

      rerender(
        <BasicAppContext>
          <RadioListScreen options={options} currentValue={3} onSelect={jest.fn()} />
        </BasicAppContext>
      )

      expect(getByLabelText('5').props.isChecked).toBe(false)
      expect(getByLabelText('3').props.isChecked).toBe(true)
    })
  })

  describe('interaction', () => {
    it('calls onSelect with the option value when a row is pressed', () => {
      const onSelect = jest.fn()
      const utils = renderScreen(5, onSelect)

      fireEvent.press(checkbox(utils, 3))

      expect(onSelect).toHaveBeenCalledTimes(1)
      expect(onSelect).toHaveBeenCalledWith(3)
    })

    it('passes the raw value 0 through (does not treat it as "no selection")', () => {
      const onSelect = jest.fn()
      const utils = renderScreen(5, onSelect)

      fireEvent.press(checkbox(utils, 0))

      expect(onSelect).toHaveBeenCalledWith(0)
    })

    it('reports the correct value for each row independently', () => {
      const onSelect = jest.fn()
      const utils = renderScreen(5, onSelect)

      fireEvent.press(checkbox(utils, 5))
      fireEvent.press(checkbox(utils, 3))
      fireEvent.press(checkbox(utils, 0))

      expect(onSelect.mock.calls).toEqual([[5], [3], [0]])
    })

    it('still fires onSelect when the already-selected row is pressed', () => {
      const onSelect = jest.fn()
      const utils = renderScreen(3, onSelect)

      fireEvent.press(checkbox(utils, 3))

      expect(onSelect).toHaveBeenCalledWith(3)
    })
  })
})
