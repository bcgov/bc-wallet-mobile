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

  it('blocks Done button while picker is spinning (debounce pending)', () => {
    const { getByTestId, UNSAFE_getByType } = render(
      <BasicAppContext>
        <EnterBirthdateScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    const picker = UNSAFE_getByType(DatePicker)
    const newDate = new Date('1990-06-15T12:00:00.000Z')

    // Simulate date change — starts debounce, sets pickerState to 'spinning'
    act(() => {
      picker.props.onDateChange(newDate)
    })

    // Tap Done while debounce is still pending
    const doneButton = getByTestId('com.ariesbifold:id/Done')
    fireEvent.press(doneButton)

    // handleSubmit should NOT have been called (no navigation, no error)
    expect(mockNavigation.navigate).not.toHaveBeenCalled()
    expect(mockNavigation.goBack).not.toHaveBeenCalled()
  })

  it('allows Done button after debounce settles', () => {
    const { getByTestId, UNSAFE_getByType } = render(
      <BasicAppContext>
        <EnterBirthdateScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    const picker = UNSAFE_getByType(DatePicker)
    const newDate = new Date('1990-06-15T12:00:00.000Z')

    act(() => {
      picker.props.onDateChange(newDate)
    })

    // Advance past the 400ms debounce
    act(() => {
      jest.advanceTimersByTime(400)
    })

    // Done button should now be pressable (pickerState is 'idle')
    const doneButton = getByTestId('com.ariesbifold:id/Done')
    fireEvent.press(doneButton)

    // handleSubmit runs — since vm.serial is undefined in test, it calls goBack
    expect(mockNavigation.goBack).toHaveBeenCalled()
  })

  it('resets debounce timer on rapid date changes', () => {
    const { getByTestId, UNSAFE_getByType } = render(
      <BasicAppContext>
        <EnterBirthdateScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    const picker = UNSAFE_getByType(DatePicker)

    // Simulate rapid intermediate values (wheel spinning through months)
    act(() => {
      picker.props.onDateChange(new Date('1990-01-15T12:00:00.000Z'))
      jest.advanceTimersByTime(200)
      picker.props.onDateChange(new Date('1990-02-15T12:00:00.000Z'))
      jest.advanceTimersByTime(200)
      picker.props.onDateChange(new Date('1990-03-15T12:00:00.000Z'))
    })

    // Only 200ms after last change — still spinning
    act(() => {
      jest.advanceTimersByTime(200)
    })
    const doneButton = getByTestId('com.ariesbifold:id/Done')
    fireEvent.press(doneButton)
    expect(mockNavigation.goBack).not.toHaveBeenCalled()

    // Advance remaining 200ms — debounce settles
    act(() => {
      jest.advanceTimersByTime(200)
    })
    fireEvent.press(doneButton)
    expect(mockNavigation.goBack).toHaveBeenCalled()
  })

  it('cleans up debounce timer on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')

    const { UNSAFE_getByType, unmount } = render(
      <BasicAppContext>
        <EnterBirthdateScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    const picker = UNSAFE_getByType(DatePicker)
    act(() => {
      picker.props.onDateChange(new Date('1990-06-15T12:00:00.000Z'))
    })

    // Unmount while debounce is still pending
    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
  })
})
