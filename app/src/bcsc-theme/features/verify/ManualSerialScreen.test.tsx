import { ErrorAlertProvider } from '@/contexts/ErrorAlertContext'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { testIdWithKey } from '@bifold/core'
import { act, fireEvent, render } from '@testing-library/react-native'
import { default as React } from 'react'
import { ScrollView, TextInput } from 'react-native'
import ManualSerialScreen from './ManualSerialScreen'

describe('ManualSerial', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <ErrorAlertProvider>
          <ManualSerialScreen navigation={mockNavigation as never} />
        </ErrorAlertProvider>
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('jumps to and focuses the serial field when the serial is invalid', async () => {
    const scrollToSpy = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(jest.fn())
    const focusSpy = jest.spyOn(TextInput.prototype, 'focus')
    const tree = render(
      <BasicAppContext>
        <ErrorAlertProvider>
          <ManualSerialScreen navigation={mockNavigation as never} />
        </ErrorAlertProvider>
      </BasicAppContext>
    )

    fireEvent(tree.getByTestId('com.ariesbifold:id/serial-input'), 'layout', { nativeEvent: { layout: { y: 80 } } })
    await act(async () => {
      fireEvent.press(tree.getByTestId(testIdWithKey('Continue')))
    })

    expect(scrollToSpy).toHaveBeenCalledWith({ y: 80, animated: false })
    expect(focusSpy.mock.instances.map((i: any) => i.props.testID)).toEqual(['com.ariesbifold:id/serial-input'])
    scrollToSpy.mockRestore()
    focusSpy.mockRestore()
  })
})
