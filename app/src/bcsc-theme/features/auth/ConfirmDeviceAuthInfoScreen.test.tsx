import { ConfirmDeviceAuthInfoScreen } from '@/bcsc-theme/features/auth/ConfirmDeviceAuthInfoScreen'
import { initialState } from '@/store'
import * as Bifold from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { setHideDeviceAuthPrepFlag } from 'react-native-bcsc-core'

jest.mock('@bifold/core', () => ({
  ...jest.requireActual('@bifold/core'),
  useStore: jest.fn(),
}))

jest.mock('react-native-bcsc-core', () => ({
  setHideDeviceAuthPrepFlag: jest.fn().mockResolvedValue(true),
}))

const mockPerformDeviceAuth = jest.fn()
jest.mock('@/bcsc-theme/hooks/useAuthentication', () => ({
  useAuthentication: () => ({
    performDeviceAuth: mockPerformDeviceAuth,
  }),
}))

describe('ConfirmDeviceAuthInfoScreen', () => {
  let mockNavigation: any

  beforeEach(() => {
    jest.clearAllMocks()
    mockNavigation = useNavigation()
    jest.mocked(Bifold.useStore).mockReturnValue([initialState as any, jest.fn()])
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

    expect(tree.getByText(`BCSC.ConfirmDeviceAuth.Title`)).toBeTruthy()
    expect(tree.getByText(`BCSC.ConfirmDeviceAuth.Description1`)).toBeTruthy()
    expect(tree.getByText(`BCSC.ConfirmDeviceAuth.Description2`)).toBeTruthy()
  })

  it('toggles checkbox when pressed', () => {
    const tree = render(
      <BasicAppContext>
        <ConfirmDeviceAuthInfoScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    const checkbox = tree.getByTestId('com.ariesbifold:id/HideConfirmationCheckbox')
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

  it('calls setHideDeviceAuthPrepFlag when checkbox is checked and Continue is pressed', async () => {
    const tree = render(
      <BasicAppContext>
        <ConfirmDeviceAuthInfoScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    fireEvent.press(tree.getByTestId('com.ariesbifold:id/HideConfirmationCheckbox'))
    fireEvent.press(tree.getByTestId('com.ariesbifold:id/Continue'))

    expect(setHideDeviceAuthPrepFlag).toHaveBeenCalledWith(true)
  })

  it('does not call setHideDeviceAuthPrepFlag when checkbox is unchecked and Continue is pressed', () => {
    const tree = render(
      <BasicAppContext>
        <ConfirmDeviceAuthInfoScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    fireEvent.press(tree.getByTestId('com.ariesbifold:id/Continue'))

    expect(setHideDeviceAuthPrepFlag).not.toHaveBeenCalled()
  })
})
