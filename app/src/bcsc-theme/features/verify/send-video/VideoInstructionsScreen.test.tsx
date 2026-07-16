import useVideoPrompts from '@/bcsc-theme/hooks/useVideoPrompts'
import { useFocusEffect } from '@mocks/@react-navigation/native'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import React, { useEffect } from 'react'
import { ScrollView } from 'react-native'
import VideoInstructionsScreen from './VideoInstructionsScreen'

jest.mock('@/bcsc-theme/hooks/useVideoPrompts')

const mockVideoPromptsMissingAlert = jest.fn()
jest.mock('@/hooks/useAlerts', () => ({
  useAlerts: () => ({ videoPromptsMissingAlert: mockVideoPromptsMissingAlert }),
}))

const promptsState = { bcsc: { prompts: [{ id: 1, prompt: 'Say your name' }] } } as any

describe('VideoInstructions', () => {
  let mockNavigation: any
  const focusEffectMock = useFocusEffect as jest.Mock
  const mockRefreshPrompts = jest.fn()
  // Callbacks currently registered through useFocusEffect, so a test can refocus a mounted screen.
  const focusCallbacks = new Set<() => void | (() => void)>()

  const renderScreen = () =>
    render(
      <BasicAppContext initialStateOverride={promptsState}>
        <VideoInstructionsScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

  /**
   * Refocuses the mounted screen, as returning from TakeVideo or VideoReview does.
   *
   * The screen is never unmounted on those paths, so a stub that only fires on mount cannot tell a
   * `useFocusEffect` apart from a plain mount effect — and refresh-on-return is the whole point here.
   */
  const refocus = async () => {
    await act(async () => {
      focusCallbacks.forEach((callback) => callback())
    })
  }

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    focusCallbacks.clear()
    // Emulate React Navigation's focus lifecycle: run on mount, and stay registered so `refocus` can
    // fire the callback again on a screen that never unmounted.
    focusEffectMock.mockImplementation((callback: () => void | (() => void)) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useEffect(() => {
        const cleanup = callback()
        focusCallbacks.add(callback)

        return () => {
          focusCallbacks.delete(callback)
          cleanup?.()
        }
      }, [callback])
    })
    mockRefreshPrompts.mockResolvedValue(true)
    jest.mocked(useVideoPrompts).mockReturnValue({
      refreshPrompts: mockRefreshPrompts,
      ensureVerificationRequest: jest.fn(),
      isRefreshingPrompts: false,
    })
  })

  it('renders correctly', async () => {
    const tree = renderScreen()

    await waitFor(() => expect(tree.queryByTestId('PromptsLoading')).toBeNull())

    expect(tree).toMatchSnapshot()
  })

  it('issues a fresh prompt set when the screen is focused', async () => {
    // Arriving here always precedes a recording, so the set the user is about to be asked has to be
    // issued now rather than replayed from an earlier attempt.
    renderScreen()

    await waitFor(() => expect(mockRefreshPrompts).toHaveBeenCalledTimes(1))
  })

  it('issues another set when the screen is refocused', async () => {
    // Returning here after cancelling a recording, or backing out of VideoReview, leaves this screen
    // mounted. Reusing the set from the abandoned attempt is exactly the replay this flow guards
    // against, so a refocus has to re-issue.
    renderScreen()
    await waitFor(() => expect(mockRefreshPrompts).toHaveBeenCalledTimes(1))

    await refocus()

    expect(mockRefreshPrompts).toHaveBeenCalledTimes(2)
  })

  it('resets the scroll position to the top on refocus', async () => {
    // The screen stays mounted beneath the camera, so backing out of a recording returns to it at the
    // offset the user left — the fresh set should read from the start, not mid-list.
    const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo')

    renderScreen()
    await waitFor(() => expect(mockRefreshPrompts).toHaveBeenCalledTimes(1))
    scrollTo.mockClear()

    await refocus()

    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ y: 0 }))
    scrollTo.mockRestore()
  })

  it('withholds the prompt list and blocks recording until a fresh set lands', async () => {
    let resolveRefresh: (value: boolean) => void
    mockRefreshPrompts.mockReturnValue(
      new Promise<boolean>((resolve) => {
        resolveRefresh = resolve
      })
    )

    const tree = renderScreen()

    // Showing the cached set here would tell the user to expect prompts they won't be asked.
    expect(tree.queryByTestId('PromptsLoading')).not.toBeNull()
    expect(tree.queryByText('Say your name')).toBeNull()
    expect(tree.getByTestId('StartRecordingButton')).toBeDisabled()

    await waitFor(async () => {
      resolveRefresh!(true)
    })

    await waitFor(() => expect(tree.getByTestId('StartRecordingButton')).toBeEnabled())
    expect(tree.queryByText('Say your name')).not.toBeNull()
  })

  it('alerts and keeps recording blocked when a fresh set cannot be issued', async () => {
    // Falling back to the cached set would put the user back in front of the camera answering a
    // challenge the server already issued — the bug this screen guards against.
    mockRefreshPrompts.mockResolvedValue(false)

    const tree = renderScreen()

    await waitFor(() => expect(mockVideoPromptsMissingAlert).toHaveBeenCalledTimes(1))

    expect(tree.getByTestId('StartRecordingButton')).toBeDisabled()
    expect(tree.queryByText('Say your name')).toBeNull()
  })

  it('offers a retry instead of an endless spinner when the fetch fails', async () => {
    // The alert is dismiss-only and this screen sits after every photo step, so without a retry the
    // user's only escape is backing out and redoing the photos.
    mockRefreshPrompts.mockResolvedValue(false)

    const tree = renderScreen()

    await waitFor(() => expect(tree.queryByTestId('RetryLoadPrompts')).not.toBeNull())
    expect(tree.queryByTestId('PromptsLoading')).toBeNull()
  })

  it('recovers when the retry succeeds', async () => {
    mockRefreshPrompts.mockResolvedValue(false)

    const tree = renderScreen()
    await waitFor(() => expect(tree.queryByTestId('RetryLoadPrompts')).not.toBeNull())

    mockRefreshPrompts.mockResolvedValue(true)
    fireEvent.press(tree.getByTestId('RetryLoadPrompts'))

    await waitFor(() => expect(tree.getByTestId('StartRecordingButton')).toBeEnabled())
    expect(mockRefreshPrompts).toHaveBeenCalledTimes(2)
    expect(tree.queryByText('Say your name')).not.toBeNull()
    expect(tree.queryByTestId('RetryLoadPrompts')).toBeNull()
  })
})
