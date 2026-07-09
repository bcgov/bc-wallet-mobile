import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
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

  it('keeps the Continue button enabled when no date is entered', () => {
    const { getByTestId } = render(
      <BasicAppContext>
        <EnterBirthdateScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    const continueButton = getByTestId('com.ariesbifold:id/Continue')
    expect(continueButton.props.accessibilityState?.disabled).toBeFalsy()
  })

  it('shows an error and does not proceed when Continue is pressed with an empty date', () => {
    const { getByTestId, getByText } = render(
      <BasicAppContext>
        <EnterBirthdateScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    const continueButton = getByTestId('com.ariesbifold:id/Continue')
    fireEvent.press(continueButton)

    // Empty input now surfaces an error instead of silently doing nothing
    expect(getByText('BCSC.Birthdate.InvalidDate')).toBeTruthy()
    expect(mockNavigation.navigate).not.toHaveBeenCalled()
    expect(mockNavigation.goBack).not.toHaveBeenCalled()
  })

  it('updates birthdate field with typed slash date value', () => {
    const { getByTestId } = render(
      <BasicAppContext>
        <EnterBirthdateScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    const input = getByTestId('com.ariesbifold:id/birthDate-input')
    fireEvent.changeText(input, '1990/06/15')

    expect(input.props.value).toBe('1990/06/15')
  })

  it('shows an error and does not proceed for an invalid complete date', () => {
    const { getByTestId, getByText } = render(
      <BasicAppContext>
        <EnterBirthdateScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    const input = getByTestId('com.ariesbifold:id/birthDate-input')
    fireEvent.changeText(input, '1990/13/40')

    // A complete but invalid date surfaces the error reactively
    expect(getByText('BCSC.Birthdate.InvalidDate')).toBeTruthy()

    const continueButton = getByTestId('com.ariesbifold:id/Continue')
    fireEvent.press(continueButton)

    expect(mockNavigation.navigate).not.toHaveBeenCalled()
    expect(mockNavigation.goBack).not.toHaveBeenCalled()
  })

  it('allows Continue button after a valid date is typed', () => {
    const { getByTestId } = render(
      <BasicAppContext>
        <EnterBirthdateScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    const input = getByTestId('com.ariesbifold:id/birthDate-input')
    fireEvent.changeText(input, '1990/06/15')

    const continueButton = getByTestId('com.ariesbifold:id/Continue')
    fireEvent.press(continueButton)

    // handleSubmit runs — since vm.serial is undefined in test, it calls goBack
    expect(mockNavigation.goBack).toHaveBeenCalled()
  })
})
