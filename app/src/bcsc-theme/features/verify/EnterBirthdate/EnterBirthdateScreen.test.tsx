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

  it('keeps Done disabled for an invalid complete date', () => {
    const { getByTestId } = render(
      <BasicAppContext>
        <EnterBirthdateScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    const input = getByTestId('com.ariesbifold:id/birthDate-input')
    fireEvent.changeText(input, '1990/13/40')

    const doneButton = getByTestId('com.ariesbifold:id/Done')
    fireEvent.press(doneButton)

    expect(mockNavigation.navigate).not.toHaveBeenCalled()
    expect(mockNavigation.goBack).not.toHaveBeenCalled()
  })

  it('allows Done button after a valid date is typed', () => {
    const { getByTestId } = render(
      <BasicAppContext>
        <EnterBirthdateScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    const input = getByTestId('com.ariesbifold:id/birthDate-input')
    fireEvent.changeText(input, '1990/06/15')

    const doneButton = getByTestId('com.ariesbifold:id/Done')
    fireEvent.press(doneButton)

    // handleSubmit runs — since vm.serial is undefined in test, it calls goBack
    expect(mockNavigation.goBack).toHaveBeenCalled()
  })
})
