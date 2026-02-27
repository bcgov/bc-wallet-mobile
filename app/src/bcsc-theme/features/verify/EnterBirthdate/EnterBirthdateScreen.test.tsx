import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import DatePicker from 'react-native-date-picker'
import EnterBirthdateScreen from './EnterBirthdateScreen'

describe('EnterBirthdate', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2025-12-03T00:00:00.000Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <EnterBirthdateScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('Done button is disabled when no date is selected', () => {
    const { getByTestId } = render(
      <BasicAppContext>
        <EnterBirthdateScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    const doneButton = getByTestId('com.ariesbifold:id/Done')
    fireEvent.press(doneButton)

    // handleSubmit should not run — no date selected means button is disabled
    expect(mockNavigation.navigate).not.toHaveBeenCalled()
    expect(mockNavigation.goBack).not.toHaveBeenCalled()
  })

  it('opens modal date picker when input is pressed', () => {
    const { getByTestId, UNSAFE_getByType } = render(
      <BasicAppContext>
        <EnterBirthdateScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    const picker = UNSAFE_getByType(DatePicker)
    expect(picker.props.open).toBe(false)

    const input = getByTestId('com.ariesbifold:id/birthDate-input')
    fireEvent(input, 'pressIn')

    const updatedPicker = UNSAFE_getByType(DatePicker)
    expect(updatedPicker.props.open).toBe(true)
  })

  it('sets date and closes modal on confirm', () => {
    const { getByTestId, UNSAFE_getByType } = render(
      <BasicAppContext>
        <EnterBirthdateScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    const picker = UNSAFE_getByType(DatePicker)
    const selectedDate = new Date('1990-06-15T12:00:00.000Z')

    act(() => {
      picker.props.onConfirm(selectedDate)
    })

    // Modal should close after confirming
    const updatedPicker = UNSAFE_getByType(DatePicker)
    expect(updatedPicker.props.open).toBe(false)

    // Input should display the formatted date
    const input = getByTestId('com.ariesbifold:id/birthDate-input')
    expect(input.props.value).toBe('1990-06-15')
  })

  it('closes modal without changing date on cancel', () => {
    const { getByTestId, UNSAFE_getByType } = render(
      <BasicAppContext>
        <EnterBirthdateScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    // Open the picker first
    const input = getByTestId('com.ariesbifold:id/birthDate-input')
    fireEvent(input, 'pressIn')

    const picker = UNSAFE_getByType(DatePicker)
    expect(picker.props.open).toBe(true)

    act(() => {
      picker.props.onCancel()
    })

    // Modal should close
    const updatedPicker = UNSAFE_getByType(DatePicker)
    expect(updatedPicker.props.open).toBe(false)

    // Input should remain empty
    expect(input.props.value).toBe('')
  })

  it('allows Done button after a date is confirmed', () => {
    const { getByTestId, UNSAFE_getByType } = render(
      <BasicAppContext>
        <EnterBirthdateScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    const picker = UNSAFE_getByType(DatePicker)
    const selectedDate = new Date('1990-06-15T12:00:00.000Z')

    act(() => {
      picker.props.onConfirm(selectedDate)
    })

    const doneButton = getByTestId('com.ariesbifold:id/Done')
    fireEvent.press(doneButton)

    // handleSubmit runs — since vm.serial is undefined in test, it calls goBack
    expect(mockNavigation.goBack).toHaveBeenCalled()
  })
})
