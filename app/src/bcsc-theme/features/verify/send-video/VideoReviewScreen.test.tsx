import useVideoPrompts from '@/bcsc-theme/hooks/useVideoPrompts'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { useFocusEffect } from '@react-navigation/native'
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

      return mockNavigation.addListener.mock.calls.find(([event]: [string]) => event === 'beforeRemove')?.[1]
    }

    it('redirects the Android hardware back button to the instructions screen', () => {
      const handler = captureBeforeRemove()
      // The hardware back button reaches the container ref, so its action carries no source.
      const event = { data: { action: { type: 'GO_BACK' } }, preventDefault: jest.fn() }

      handler(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.VideoInstructions)
    })

    it.each([
      ['Retake', { type: 'GO_BACK', source: 'video-review-key' }],
      ['the header back button', { type: 'NAVIGATE', source: 'video-review-key' }],
      ['Use Video', { type: 'RESET', source: 'video-review-key' }],
    ])('lets %s through untouched', (_label, action) => {
      // These all dispatch through this screen's own navigation object, which stamps a source. Redirecting
      // them would send Retake to the instructions screen and loop the header button on itself.
      const handler = captureBeforeRemove()
      const event = { data: { action }, preventDefault: jest.fn() }

      handler(event)

      expect(event.preventDefault).not.toHaveBeenCalled()
      expect(mockNavigation.navigate).not.toHaveBeenCalled()
    })
  })
})
