import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { ScrollView, TextInput } from 'react-native'
import EnterBirthdateScreen from './EnterBirthdateScreen'
import * as viewModel from './useEnterBirthdateViewModel'

jest.mock('@/bcsc-theme/api/hooks/useApi')

const renderScreen = (navigation: any) =>
  render(
    <BasicAppContext>
      <EnterBirthdateScreen navigation={navigation} />
    </BasicAppContext>
  )

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
    const tree = renderScreen(mockNavigation as never)

    expect(tree).toMatchSnapshot()
  })

  it('keeps the Continue button enabled when no date is entered', () => {
    const { getByTestId } = renderScreen(mockNavigation as never)

    const continueButton = getByTestId('com.ariesbifold:id/Continue')
    expect(continueButton.props.accessibilityState?.disabled).toBeFalsy()
  })

  it('shows an error and does not proceed when Continue is pressed with an empty date', () => {
    const { getByTestId, getByText } = renderScreen(mockNavigation as never)

    const continueButton = getByTestId('com.ariesbifold:id/Continue')
    fireEvent.press(continueButton)

    // Empty input now surfaces an error instead of silently doing nothing
    expect(getByText('BCSC.Birthdate.InvalidDate')).toBeTruthy()
    expect(mockNavigation.navigate).not.toHaveBeenCalled()
    expect(mockNavigation.goBack).not.toHaveBeenCalled()
  })

  it('jumps to and focuses the date field when Continue is pressed with an invalid date', async () => {
    const scrollToSpy = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(jest.fn())
    const focusSpy = jest.spyOn(TextInput.prototype, 'focus')
    const { getByTestId } = renderScreen(mockNavigation as never)

    const input = getByTestId('com.ariesbifold:id/birthDate-input')
    fireEvent(input, 'layout', { nativeEvent: { layout: { y: 60 } } })
    fireEvent.changeText(input, '2999/99/99')
    await act(async () => {
      fireEvent.press(getByTestId('com.ariesbifold:id/Continue'))
    })

    expect(scrollToSpy).toHaveBeenCalledWith({ y: 60, animated: false })
    expect(focusSpy.mock.instances.map((i: any) => i.props.testID)).toEqual(['com.ariesbifold:id/birthDate-input'])
    scrollToSpy.mockRestore()
    focusSpy.mockRestore()
  })

  it('updates birthdate field with typed slash date value', () => {
    const { getByTestId } = renderScreen(mockNavigation as never)

    const input = getByTestId('com.ariesbifold:id/birthDate-input')
    fireEvent.changeText(input, '1990/06/15')

    expect(input.props.value).toBe('1990/06/15')
  })

  it('shows an error and does not proceed for an invalid complete date', () => {
    const { getByTestId, getByText } = renderScreen(mockNavigation as never)

    const input = getByTestId('com.ariesbifold:id/birthDate-input')
    fireEvent.changeText(input, '1990/13/40')

    // A complete but invalid date surfaces the error reactively
    expect(getByText('BCSC.Birthdate.InvalidDate')).toBeTruthy()

    const continueButton = getByTestId('com.ariesbifold:id/Continue')
    fireEvent.press(continueButton)

    expect(mockNavigation.navigate).not.toHaveBeenCalled()
    expect(mockNavigation.goBack).not.toHaveBeenCalled()
  })

  it('goes back when no serial is stored', () => {
    const { getByTestId } = renderScreen(mockNavigation as never)

    const input = getByTestId('com.ariesbifold:id/birthDate-input')
    fireEvent.changeText(input, '1990/06/15')

    const continueButton = getByTestId('com.ariesbifold:id/Continue')
    fireEvent.press(continueButton)

    expect(mockNavigation.goBack).toHaveBeenCalled()
  })

  it('authorizes the stored serial with the typed date after a valid date is typed', async () => {
    const authorizeDevice = jest.fn().mockResolvedValue(undefined)
    const actualUseViewModel = viewModel.useEnterBirthdateViewModel
    const spy = jest
      .spyOn(viewModel, 'useEnterBirthdateViewModel')
      .mockImplementation((navigation) => ({ ...actualUseViewModel(navigation), serial: 'S12345678', authorizeDevice }))

    try {
      const { getByTestId } = renderScreen(mockNavigation as never)

      fireEvent.changeText(getByTestId('com.ariesbifold:id/birthDate-input'), '1990/06/15')
      fireEvent.press(getByTestId('com.ariesbifold:id/Continue'))

      await waitFor(() => expect(authorizeDevice).toHaveBeenCalledWith('S12345678', new Date(1990, 5, 15)))
      expect(mockNavigation.goBack).not.toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })
})
