import useVideoPrompts from '@/bcsc-theme/hooks/useVideoPrompts'
import usePreventGestureBack from '@/hooks/usePreventGestureBack'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import VideoTooLongScreen from './VideoTooLongScreen'

jest.mock('@/bcsc-theme/hooks/useVideoPrompts')
jest.mock('@/hooks/usePreventGestureBack')

const mockVideoPromptsMissingAlert = jest.fn()
jest.mock('@/hooks/useAlerts', () => ({
  useAlerts: () => ({ videoPromptsMissingAlert: mockVideoPromptsMissingAlert }),
}))

describe('VideoTooLong', () => {
  let mockNavigation: any
  const mockRefreshPrompts = jest.fn()

  const renderScreen = () =>
    render(
      <BasicAppContext>
        <VideoTooLongScreen navigation={mockNavigation as never} route={{ params: { videoLengthSeconds: 60 } }} />
      </BasicAppContext>
    )

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockRefreshPrompts.mockResolvedValue(true)
    jest.mocked(useVideoPrompts).mockReturnValue({
      refreshPrompts: mockRefreshPrompts,
      ensureVerificationRequest: jest.fn(),
      isRefreshingPrompts: false,
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const tree = renderScreen()

    expect(tree).toMatchSnapshot()
  })

  it('issues a fresh prompt set before returning to the camera', async () => {
    // Retake goes straight back to TakeVideo, which re-arms recording on focus — this is the last point
    // at which the next attempt's challenge set can be issued.
    const tree = renderScreen()

    fireEvent.press(tree.getByText('BCSC.SendVideo.VideoTooLong.ButtonText'))

    await waitFor(() => expect(mockNavigation.goBack).toHaveBeenCalledTimes(1))
    expect(mockRefreshPrompts).toHaveBeenCalledTimes(1)
  })

  it('holds the user here and alerts when a fresh set cannot be issued', async () => {
    mockRefreshPrompts.mockResolvedValue(false)

    const tree = renderScreen()

    fireEvent.press(tree.getByText('BCSC.SendVideo.VideoTooLong.ButtonText'))

    await waitFor(() => expect(mockVideoPromptsMissingAlert).toHaveBeenCalledTimes(1))
    expect(mockNavigation.goBack).not.toHaveBeenCalled()
  })

  it('closes the back path around Retake', () => {
    // Back would pop to TakeVideo and re-record against the set this over-long attempt already answered.
    // Retake and Cancel are the deliberate exits; the hook covers Android's hardware back, and
    // gestureEnabled: false in VerifyStack covers the iOS swipe.
    renderScreen()

    expect(usePreventGestureBack).toHaveBeenCalled()
  })
})
