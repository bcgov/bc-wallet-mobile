import useVideoPrompts from '@/bcsc-theme/hooks/useVideoPrompts'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { useNavigation as useContextNavigation, useFocusEffect } from '@react-navigation/native'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import VideoReviewScreen from './VideoReviewScreen'

jest.mock('@/bcsc-theme/hooks/useVideoPrompts')

const mockVideoPromptsMissingAlert = jest.fn()
const mockFailedToReadFromLocalStorageAlert = jest.fn()
jest.mock('@/hooks/useAlerts', () => ({
  useAlerts: () => ({
    videoPromptsMissingAlert: mockVideoPromptsMissingAlert,
    failedToReadFromLocalStorageAlert: mockFailedToReadFromLocalStorageAlert,
  }),
}))

describe('VideoReview', () => {
  let mockNavigation: any
  const mockRefreshPrompts = jest.fn()
  // usePreventGestureBack subscribes through useNavigation() (context), not the screen's prop.
  const mockAddListener = jest.fn()
  const route = { params: { videoPath: 'file://test.mp4', videoThumbnailPath: 'file://thumbnail.jpg' } }

  const renderScreen = () =>
    render(
      <BasicAppContext>
        <VideoReviewScreen navigation={mockNavigation as never} route={route as never} />
      </BasicAppContext>
    )

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
    ;(useContextNavigation() as any).addListener = mockAddListener
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
    // The reported bug: retake replayed the cached set, so every attempt answered the same challenge.
    // TakeVideo re-arms recording the moment it refocuses, so the set must be issued before goBack.
    const tree = renderScreen()

    fireEvent.press(tree.getByText('BCSC.SendVideo.VideoReview.RetakeVideo'))

    await waitFor(() => expect(mockNavigation.goBack).toHaveBeenCalledTimes(1))
    expect(mockRefreshPrompts).toHaveBeenCalledTimes(1)
  })

  it('holds the user on the review screen and alerts when a fresh set cannot be issued', async () => {
    // Going back with the cached set would re-record against a challenge the server already issued.
    mockRefreshPrompts.mockResolvedValue(false)

    const tree = renderScreen()

    fireEvent.press(tree.getByText('BCSC.SendVideo.VideoReview.RetakeVideo'))

    await waitFor(() => expect(mockVideoPromptsMissingAlert).toHaveBeenCalledTimes(1))
    expect(mockNavigation.goBack).not.toHaveBeenCalled()
  })

  it('blocks both actions while a refresh is in flight', async () => {
    // A landed refresh rotates the sha this recording is bound to, so accepting it mid-refresh would
    // finalize against a sha the server has already replaced.
    jest.mocked(useVideoPrompts).mockReturnValue({
      refreshPrompts: mockRefreshPrompts,
      ensureVerificationRequest: jest.fn(),
      isRefreshingPrompts: true,
    })

    const tree = renderScreen()

    expect(tree.getByText('BCSC.SendVideo.VideoReview.UseVideo')).toBeDisabled()
    expect(tree.getByText('BCSC.SendVideo.VideoReview.RetakeVideo')).toBeDisabled()
  })

  describe('back interception', () => {
    // Popping to TakeVideo would re-arm recording against the set this video already answered. Redirecting
    // to VideoInstructions instead lets its focus effect issue a fresh set before the next recording.
    beforeEach(() => {
      // Mocked as a no-op globally, so the listener is never registered until it actually runs the effect.
      jest.mocked(useFocusEffect).mockImplementation((cb: any) => {
        cb()
      })
    })

    afterEach(() => {
      jest.mocked(useFocusEffect).mockReset()
    })

    const captureBeforeRemove = () => {
      renderScreen()

      return mockAddListener.mock.calls.find(([event]: [string]) => event === 'beforeRemove')?.[1]
    }

    // Android's hardware back reaches the container ref, which stamps neither source nor target.
    const hardwareBackEvent = () => ({ data: { action: { type: 'GO_BACK' } }, preventDefault: jest.fn() })

    it('redirects the Android hardware back button to the instructions screen', () => {
      const handler = captureBeforeRemove()
      const event = hardwareBackEvent()

      handler(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.VideoInstructions)
    })

    it('lets this screen’s own dispatches through untouched', () => {
      // Retake, Use Video and the header back button all dispatch through this route's navigation
      // object, which stamps a source. Redirecting them would send Retake to the instructions screen
      // instead of the camera. The source is the only thing separating them from a hardware back, so the
      // action type is held identical here — varying it would let this pass on a type check alone.
      const handler = captureBeforeRemove()
      const event = { data: { action: { type: 'GO_BACK', source: 'video-review-key' } }, preventDefault: jest.fn() }

      handler(event)

      expect(event.preventDefault).not.toHaveBeenCalled()
      expect(mockNavigation.navigate).not.toHaveBeenCalled()
    })

    it('holds the user here while a retake refresh is in flight', () => {
      // The buttons are disabled for this window but the hardware back is not. Leaving now would strand
      // onPressRetake's goBack() on an unmounted screen: it carries a source but no target, so the router
      // pops whatever replaced this route instead, dumping the user two screens back.
      jest.mocked(useVideoPrompts).mockReturnValue({
        refreshPrompts: mockRefreshPrompts,
        ensureVerificationRequest: jest.fn(),
        isRefreshingPrompts: true,
      })

      const handler = captureBeforeRemove()
      const event = hardwareBackEvent()

      handler(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(mockNavigation.navigate).not.toHaveBeenCalled()
    })
  })
})
