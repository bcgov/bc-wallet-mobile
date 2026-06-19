import { SessionRecoveryScreen } from '@/bcsc-theme/features/auth/SessionRecoveryScreen'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'

const mockFactoryReset = jest.fn()
jest.mock('@/bcsc-theme/api/hooks/useFactoryReset', () => ({
  useFactoryReset: () => mockFactoryReset,
}))

const mockFactoryResetAlert = jest.fn()
jest.mock('@/hooks/useAlerts', () => ({
  useAlerts: () => ({ factoryResetAlert: mockFactoryResetAlert }),
}))

const mockStopLoading = jest.fn()
jest.mock('../../contexts/BCSCLoadingContext', () => ({
  useLoadingScreen: () => ({ startLoading: jest.fn(() => mockStopLoading) }),
}))

const RESET_BUTTON = 'com.ariesbifold:id/SessionRecoveryReset'

describe('SessionRecoveryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <SessionRecoveryScreen />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('shows the reset explanation and primary action', () => {
    const tree = render(
      <BasicAppContext>
        <SessionRecoveryScreen />
      </BasicAppContext>
    )

    expect(tree.getByText('BCSC.SessionRecovery.Header')).toBeTruthy()
    expect(tree.getByText('BCSC.SessionRecovery.Body')).toBeTruthy()
    expect(tree.getByText('BCSC.SessionRecovery.BodyAction')).toBeTruthy()
    expect(tree.getByTestId(RESET_BUTTON)).toBeTruthy()
  })

  it('performs a factory reset and surfaces no alert on success', async () => {
    mockFactoryReset.mockResolvedValue({ success: true })

    const tree = render(
      <BasicAppContext>
        <SessionRecoveryScreen />
      </BasicAppContext>
    )

    fireEvent.press(tree.getByTestId(RESET_BUTTON))

    await waitFor(() => {
      expect(mockFactoryReset).toHaveBeenCalledTimes(1)
    })
    expect(mockFactoryResetAlert).not.toHaveBeenCalled()
    expect(mockStopLoading).toHaveBeenCalledTimes(1)
  })

  it('surfaces the factory reset alert when the reset fails', async () => {
    const error = new Error('reset failed')
    mockFactoryReset.mockResolvedValue({ success: false, error })

    const tree = render(
      <BasicAppContext>
        <SessionRecoveryScreen />
      </BasicAppContext>
    )

    fireEvent.press(tree.getByTestId(RESET_BUTTON))

    await waitFor(() => {
      expect(mockFactoryResetAlert).toHaveBeenCalledWith(error)
    })
    // Loading is always stopped, even on failure
    expect(mockStopLoading).toHaveBeenCalledTimes(1)
  })
})
