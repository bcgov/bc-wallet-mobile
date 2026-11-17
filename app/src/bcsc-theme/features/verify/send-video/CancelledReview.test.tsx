import * as BCSCLoadingContextModule from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/@react-navigation/native'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import CancelledReview from './CancelledReview'

jest.mock('@/bcsc-theme/contexts/BCSCLoadingContext', () => ({
  useLoadingScreen: jest.fn(),
}))

const mockVerificationReset = jest.fn().mockResolvedValue(true)
jest.mock('@/bcsc-theme/hooks/useVerificationReset', () => ({
  useVerificationReset: jest.fn(() => mockVerificationReset),
}))

const mockCleanUpVerificationData = jest.fn()
const mockResumeVerification = jest.fn()
const mockRetryWithNewVideo = jest.fn()
jest.mock('./CancelledReviewViewModel', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    cleanUpVerificationData: mockCleanUpVerificationData,
    resumeVerification: mockResumeVerification,
    retryWithNewVideo: mockRetryWithNewVideo,
  })),
}))

const mockStopLoading = jest.fn()
const mockStartLoading = jest.fn().mockReturnValue(mockStopLoading)

describe('CancelledReview', () => {
  let mockNavigation: any
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockNavigation = useNavigation()
    mockVerificationReset.mockResolvedValue(true)
    jest.mocked(BCSCLoadingContextModule.useLoadingScreen).mockReturnValue({
      startLoading: mockStartLoading,
    } as any)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly with agent reason', () => {
    const agentReason = 'Face does not match ID document'
    const route = {
      params: {
        agentReason,
      },
    } as any

    const tree = render(
      <BasicAppContext>
        <CancelledReview route={route} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
    expect(tree.getByText('BCSC.CancelledVerification.Title')).toBeTruthy()
    expect(tree.getByText('BCSC.CancelledVerification.Label')).toBeTruthy()
  })

  it('renders with default message when no agent reason provided', () => {
    const route = {
      params: {
        agentReason: undefined,
      },
    } as any

    const tree = render(
      <BasicAppContext>
        <CancelledReview route={route} />
      </BasicAppContext>
    )

    expect(tree.getByText('BCSC.CancelledVerification.Title')).toBeTruthy()
    expect(tree.getByText('BCSC.CancelledVerification.Label')).toBeTruthy()
  })

  it('renders with empty object params', () => {
    const route = {
      params: {},
    } as any

    const tree = render(
      <BasicAppContext>
        <CancelledReview route={route} />
      </BasicAppContext>
    )

    expect(tree.getByText('BCSC.CancelledVerification.Title')).toBeTruthy()
    expect(tree.getByText('BCSC.CancelledVerification.Label')).toBeTruthy()
  })

  // Distinct route names per stack mean this screen must leave via store state, not navigation.
  it('re-enters the verify flow via resumeVerification without navigating in-stack', async () => {
    const agentReason = 'Test reason'
    const route = {
      params: {
        agentReason,
      },
    } as any

    const tree = render(
      <BasicAppContext>
        <CancelledReview route={route} />
      </BasicAppContext>
    )

    const restartButton = tree.getByText('BCSC.CancelledVerification.RestartButton')
    fireEvent.press(restartButton)

    await waitFor(() => {
      expect(mockResumeVerification).toHaveBeenCalledTimes(1)
    })
    expect(mockNavigation.reset).not.toHaveBeenCalled()
    expect(mockNavigation.goBack).not.toHaveBeenCalled()
  })

  it('shows a loading screen while the reset is in flight and hides it once settled', async () => {
    const route = {
      params: {
        agentReason: 'Test reason',
      },
    } as any

    const tree = render(
      <BasicAppContext>
        <CancelledReview route={route} />
      </BasicAppContext>
    )

    const restartButton = tree.getByText('BCSC.CancelledVerification.RestartButton')
    fireEvent.press(restartButton)

    expect(mockStartLoading).toHaveBeenCalledWith('Alerts.RestartVerification.Loading')

    await waitFor(() => {
      expect(mockStopLoading).toHaveBeenCalledTimes(1)
    })
  })

  // In the app a successful reset unmounts this screen, so a second press is unreachable; rendered
  // in isolation it still fires, which is what proves the guard releases rather than latching.
  it('releases the double-press guard once a reset has settled', async () => {
    const route = {
      params: {
        agentReason: 'Test reason',
      },
    } as any

    const tree = render(
      <BasicAppContext>
        <CancelledReview route={route} />
      </BasicAppContext>
    )

    const restartButton = tree.getByText('BCSC.CancelledVerification.RestartButton')
    fireEvent.press(restartButton)

    await waitFor(() => {
      expect(mockResumeVerification).toHaveBeenCalledTimes(1)
    })

    fireEvent.press(restartButton)

    await waitFor(() => {
      expect(mockVerificationReset).toHaveBeenCalledTimes(2)
    })
    expect(mockResumeVerification).toHaveBeenCalledTimes(2)
  })

  it('blocks a second tap while a reset is already in flight', async () => {
    let resolveReset: (value: boolean) => void = () => {}
    mockVerificationReset.mockReturnValue(
      new Promise<boolean>((resolve) => {
        resolveReset = resolve
      })
    )

    const route = {
      params: {
        agentReason: 'Test reason',
      },
    } as any

    const tree = render(
      <BasicAppContext>
        <CancelledReview route={route} />
      </BasicAppContext>
    )

    const restartButton = tree.getByText('BCSC.CancelledVerification.RestartButton')
    fireEvent.press(restartButton)
    fireEvent.press(restartButton)

    expect(mockVerificationReset).toHaveBeenCalledTimes(1)
    expect(mockStartLoading).toHaveBeenCalledTimes(1)

    resolveReset(true)
    await waitFor(() => {
      expect(mockStopLoading).toHaveBeenCalledTimes(1)
    })
    expect(mockResumeVerification).toHaveBeenCalledTimes(1)
  })

  it('re-enables the button and does not navigate when the reset fails', async () => {
    mockVerificationReset.mockResolvedValue(false)

    const route = {
      params: {
        agentReason: 'Test reason',
      },
    } as any

    const tree = render(
      <BasicAppContext>
        <CancelledReview route={route} />
      </BasicAppContext>
    )

    const restartButton = tree.getByText('BCSC.CancelledVerification.RestartButton')
    fireEvent.press(restartButton)

    await waitFor(() => {
      expect(mockStopLoading).toHaveBeenCalledTimes(1)
    })

    expect(mockResumeVerification).not.toHaveBeenCalled()
    const buttonTouchable = tree.getByTestId(testIdWithKey('RestartVerification'))
    expect(buttonTouchable.props.accessibilityState?.disabled).toBeFalsy()
  })

  it('displays both retry and restart buttons', () => {
    const route = {
      params: {
        agentReason: 'Test reason',
      },
    } as any

    const tree = render(
      <BasicAppContext>
        <CancelledReview route={route} />
      </BasicAppContext>
    )

    expect(tree.getByTestId(testIdWithKey('RetryWithNewVideo'))).toBeTruthy()
    expect(tree.getByTestId(testIdWithKey('RestartVerification'))).toBeTruthy()
  })

  // Retry keeps the ID, address and email steps — the reset belongs to the other button only.
  it('retries with a new video without resetting verification', async () => {
    const route = {
      params: {
        agentReason: 'Test reason',
      },
    } as any

    const tree = render(
      <BasicAppContext>
        <CancelledReview route={route} />
      </BasicAppContext>
    )

    fireEvent.press(tree.getByText('BCSC.CancelledVerification.RetryButton'))

    await waitFor(() => {
      expect(mockRetryWithNewVideo).toHaveBeenCalledTimes(1)
    })
    expect(mockVerificationReset).not.toHaveBeenCalled()
    expect(mockResumeVerification).not.toHaveBeenCalled()
    expect(mockStartLoading).not.toHaveBeenCalled()
  })
})
