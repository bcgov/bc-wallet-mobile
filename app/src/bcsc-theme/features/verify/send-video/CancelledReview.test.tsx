import * as BCSCLoadingContextModule from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { useNavigation } from '@mocks/@react-navigation/native'
import { BasicAppContext } from '@mocks/helpers/app'
import { testIdWithKey } from '@bifold/core'
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
const mockGoToMethodSelection = jest.fn()
jest.mock('./CancelledReviewViewModel', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    cleanUpVerificationData: mockCleanUpVerificationData,
    goToMethodSelection: mockGoToMethodSelection,
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

  it('re-enters the verify flow via goToMethodSelection when reset succeeds, without calling goBack', async () => {
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

    const okButton = tree.getByText('BCSC.CancelledVerification.Button')
    fireEvent.press(okButton)

    await waitFor(() => {
      expect(mockGoToMethodSelection).toHaveBeenCalledTimes(1)
    })
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

    const okButton = tree.getByText('BCSC.CancelledVerification.Button')
    fireEvent.press(okButton)

    expect(mockStartLoading).toHaveBeenCalledWith('Alerts.RestartVerification.Loading')

    await waitFor(() => {
      expect(mockStopLoading).toHaveBeenCalledTimes(1)
    })
  })

  it('keeps the button disabled after a successful reset so a second press does not start another reset', async () => {
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

    const okButton = tree.getByText('BCSC.CancelledVerification.Button')
    fireEvent.press(okButton)

    await waitFor(() => {
      expect(mockGoToMethodSelection).toHaveBeenCalledTimes(1)
    })

    const buttonTouchable = tree.getByTestId(testIdWithKey('SystemModalButton'))
    expect(buttonTouchable.props.accessibilityState?.disabled).toBe(true)

    fireEvent.press(okButton)
    expect(mockVerificationReset).toHaveBeenCalledTimes(1)
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

    const okButton = tree.getByText('BCSC.CancelledVerification.Button')
    fireEvent.press(okButton)
    fireEvent.press(okButton)

    expect(mockVerificationReset).toHaveBeenCalledTimes(1)
    expect(mockStartLoading).toHaveBeenCalledTimes(1)

    resolveReset(true)
    await waitFor(() => {
      expect(mockStopLoading).toHaveBeenCalledTimes(1)
    })
    expect(mockGoToMethodSelection).toHaveBeenCalledTimes(1)
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

    const okButton = tree.getByText('BCSC.CancelledVerification.Button')
    fireEvent.press(okButton)

    await waitFor(() => {
      expect(mockStopLoading).toHaveBeenCalledTimes(1)
    })

    expect(mockGoToMethodSelection).not.toHaveBeenCalled()
    const buttonTouchable = tree.getByTestId(testIdWithKey('SystemModalButton'))
    expect(buttonTouchable.props.accessibilityState?.disabled).toBeFalsy()
  })

  it('displays OK button', () => {
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

    expect(tree.getByText('BCSC.CancelledVerification.Button')).toBeTruthy()
  })

  it('renders SystemModal component', () => {
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

    // SystemModal should render with the header text
    expect(tree.getByText('BCSC.CancelledVerification.Title')).toBeTruthy()
  })
})
