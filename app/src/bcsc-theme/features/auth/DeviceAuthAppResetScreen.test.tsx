import { DeviceAuthAppResetScreen } from '@/bcsc-theme/features/auth/DeviceAuthAppResetScreen'
import { useNavigation } from '@mocks/@react-navigation/native'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'

const mockFactoryReset = jest.fn()
jest.mock('@/bcsc-theme/api/hooks/useFactoryReset', () => ({
  useFactoryReset: () => mockFactoryReset,
}))

describe('DeviceAuthAppResetScreen', () => {
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
        <DeviceAuthAppResetScreen />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('shows security reset information', () => {
    const tree = render(
      <BasicAppContext>
        <DeviceAuthAppResetScreen />
      </BasicAppContext>
    )

    expect(tree.getByText('BCSC.AppReset.Title')).toBeTruthy()
    expect(tree.getByText('BCSC.AppReset.Body1')).toBeTruthy()
    expect(tree.getByText('BCSC.AppReset.Body2')).toBeTruthy()
    expect(tree.getByText('BCSC.AppReset.Body3')).toBeTruthy()
  })

  it('shows Set Up App and Learn More buttons', () => {
    const tree = render(
      <BasicAppContext>
        <DeviceAuthAppResetScreen />
      </BasicAppContext>
    )

    expect(tree.getByTestId('com.ariesbifold:id/SetUpApp')).toBeTruthy()
    expect(tree.getByTestId('com.ariesbifold:id/LearnMore')).toBeTruthy()
  })

  it('calls factoryReset when Set Up App is pressed', async () => {
    mockFactoryReset.mockResolvedValue(undefined)

    const tree = render(
      <BasicAppContext>
        <DeviceAuthAppResetScreen />
      </BasicAppContext>
    )

    const setUpAppButton = tree.getByTestId('com.ariesbifold:id/SetUpApp')
    fireEvent.press(setUpAppButton)

    await waitFor(() => {
      expect(mockFactoryReset).toHaveBeenCalled()
    })
  })

  it('handles factoryReset error gracefully', async () => {
    mockFactoryReset.mockRejectedValue(new Error('Reset failed'))

    const tree = render(
      <BasicAppContext>
        <DeviceAuthAppResetScreen />
      </BasicAppContext>
    )

    const setUpAppButton = tree.getByTestId('com.ariesbifold:id/SetUpApp')
    fireEvent.press(setUpAppButton)

    await waitFor(() => {
      expect(mockFactoryReset).toHaveBeenCalled()
    })

    // Should not throw - error is caught and logged
  })

  it('navigates to AuthWebView when Learn More is pressed', () => {
    const tree = render(
      <BasicAppContext>
        <DeviceAuthAppResetScreen />
      </BasicAppContext>
    )

    const learnMoreButton = tree.getByTestId('com.ariesbifold:id/LearnMore')
    fireEvent.press(learnMoreButton)

    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      expect.stringContaining('Web view'),
      expect.objectContaining({ url: expect.stringContaining('secure_app.html') })
    )
  })
})
