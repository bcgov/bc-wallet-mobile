import { ConfirmDeviceAuthInfoScreen } from '@/bcsc-theme/features/auth/ConfirmDeviceAuthInfoScreen'
import { BCDispatchAction, initialState } from '@/store'
import * as Bifold from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'

jest.mock('@bifold/core', () => ({
  ...jest.requireActual('@bifold/core'),
  useStore: jest.fn(),
}))

const mockPerformDeviceAuth = jest.fn()
jest.mock('@/bcsc-theme/hooks/useAuthentication', () => ({
  useAuthentication: () => ({
    performDeviceAuth: mockPerformDeviceAuth,
  }),
}))

describe('ConfirmDeviceAuthInfoScreen', () => {
  let mockNavigation: any
  let mockDispatch: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockNavigation = useNavigation()
    mockDispatch = jest.fn()
    jest.mocked(Bifold.useStore).mockReturnValue([initialState as any, mockDispatch])
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <ConfirmDeviceAuthInfoScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('shows confirmation content', () => {
    const tree = render(
      <BasicAppContext>
        <ConfirmDeviceAuthInfoScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    expect(tree.getByText(`Confirm it's your device`)).toBeTruthy()
    expect(
      tree.getByText(
        `Each time you open this app you'll be asked for the passcode you regularly use to unlock your device. Or for Touch ID or Face ID if you use it.`
      )
    ).toBeTruthy()
    expect(
      tree.getByText(`Your passcode, Touch ID, or Face ID never leaves this device. It's never shared with this app.`)
    ).toBeTruthy()
  })

  it('toggles checkbox when pressed', () => {
    const tree = render(
      <BasicAppContext>
        <ConfirmDeviceAuthInfoScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    const checkbox = tree.getByTestId('com.ariesbifold:id/IAgree')
    fireEvent.press(checkbox)

    expect(checkbox).toBeTruthy()
  })

  it('calls performDeviceAuth when Continue is pressed', () => {
    const tree = render(
      <BasicAppContext>
        <ConfirmDeviceAuthInfoScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    fireEvent.press(tree.getByTestId('com.ariesbifold:id/Continue'))

    expect(mockPerformDeviceAuth).toHaveBeenCalled()
  })

  it('calls performDeviceAuth regardless of checkbox state', () => {
    const tree = render(
      <BasicAppContext>
        <ConfirmDeviceAuthInfoScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    // Press Continue without checking the checkbox
    fireEvent.press(tree.getByTestId('com.ariesbifold:id/Continue'))
    expect(mockPerformDeviceAuth).toHaveBeenCalledTimes(1)
  })

  it('dispatches HIDE_DEVICE_AUTH_CONFIRMATION when checkbox is checked and Continue is pressed', () => {
    const tree = render(
      <BasicAppContext>
        <ConfirmDeviceAuthInfoScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    fireEvent.press(tree.getByTestId('com.ariesbifold:id/IAgree'))
    fireEvent.press(tree.getByTestId('com.ariesbifold:id/Continue'))

    expect(mockDispatch).toHaveBeenCalledWith({
      type: BCDispatchAction.HIDE_DEVICE_AUTH_CONFIRMATION,
      payload: [true],
    })
  })

  it('does not dispatch when checkbox is unchecked and Continue is pressed', () => {
    const tree = render(
      <BasicAppContext>
        <ConfirmDeviceAuthInfoScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    fireEvent.press(tree.getByTestId('com.ariesbifold:id/Continue'))

    expect(mockDispatch).not.toHaveBeenCalled()
  })
})
