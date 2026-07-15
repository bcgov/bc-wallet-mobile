import useVideoPrompts from '@/bcsc-theme/hooks/useVideoPrompts'
import { useFocusEffect } from '@mocks/@react-navigation/native'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { render, waitFor } from '@testing-library/react-native'
import React, { useEffect } from 'react'
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

  const renderScreen = () =>
    render(
      <BasicAppContext initialStateOverride={promptsState}>
        <VideoInstructionsScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    // Run the focus callback as an effect, emulating the screen gaining focus after render
    focusEffectMock.mockImplementation((callback: () => void) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useEffect(callback, [callback])
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

  it('issues a fresh prompt set every time the screen is focused', async () => {
    // Arriving here always precedes a recording — including after cancelling one — so the set the user
    // is about to be asked has to be issued now rather than replayed from an earlier attempt.
    renderScreen()

    await waitFor(() => expect(mockRefreshPrompts).toHaveBeenCalledTimes(1))
  })

  it('does not re-fetch when the refresh re-renders the screen', async () => {
    // Refreshing writes the new prompts to the store, which re-renders this screen. If the focus effect
    // depended on the refresh callback the write would re-arm it, looping the fetch.
    renderScreen()

    await waitFor(() => expect(mockRefreshPrompts).toHaveBeenCalledTimes(1))

    expect(mockRefreshPrompts).toHaveBeenCalledTimes(1)
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
})
