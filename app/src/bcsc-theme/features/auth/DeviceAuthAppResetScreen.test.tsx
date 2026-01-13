import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'

import { DeviceAuthAppResetScreen } from '@/bcsc-theme/features/auth/DeviceAuthAppResetScreen'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'

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
        <DeviceAuthAppResetScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('shows security reset information', () => {
    const tree = render(
      <BasicAppContext>
        <DeviceAuthAppResetScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    expect(tree.getByText('App reset for security')).toBeTruthy()
    expect(tree.getByText('For security reasons, you must set and keep a passcode on your phone.')).toBeTruthy()
    expect(tree.getByText('It looks like you may have turned off the passcode on this device.')).toBeTruthy()
    expect(tree.getByText('When you do this, your app is reset and you need to set it up again.')).toBeTruthy()
  })

  it('shows Set Up App and Learn More buttons', () => {
    const tree = render(
      <BasicAppContext>
        <DeviceAuthAppResetScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    expect(tree.getByTestId('com.ariesbifold:id/SetUpApp')).toBeTruthy()
    expect(tree.getByTestId('com.ariesbifold:id/LearnMore')).toBeTruthy()
  })

  it('calls factoryReset when Set Up App is pressed', async () => {
    mockFactoryReset.mockResolvedValue(undefined)

    const tree = render(
      <BasicAppContext>
        <DeviceAuthAppResetScreen navigation={mockNavigation as never} />
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
        <DeviceAuthAppResetScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    const setUpAppButton = tree.getByTestId('com.ariesbifold:id/SetUpApp')
    fireEvent.press(setUpAppButton)

    await waitFor(() => {
      expect(mockFactoryReset).toHaveBeenCalled()
    })

    // Should not throw - error is caught and logged
  })

  it('handles Learn More press', () => {
    const tree = render(
      <BasicAppContext>
        <DeviceAuthAppResetScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    const learnMoreButton = tree.getByTestId('com.ariesbifold:id/LearnMore')
    fireEvent.press(learnMoreButton)

    // Currently a no-op (TODO in code), but should not throw
    expect(learnMoreButton).toBeTruthy()
  })
})
