import { BCSCActivityProvider } from '@/bcsc-theme/contexts/BCSCActivityContext'
import { FcmService, FcmServiceProvider, FcmViewModel } from '@/bcsc-theme/features/fcm'
import { VideoCallFlowState } from '@/bcsc-theme/features/verify/live-call/types/live-call'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import ProgressBar from '@/components/ProgressBar'
import { CROP_DELAY_MS } from '@/constants'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import LiveCallScreen from './LiveCallScreen'

const mockUseVideoCallFlow = jest.fn()
jest.mock('./hooks/useVideoCallFlow', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseVideoCallFlow(...args),
}))

const defaultVideoCallFlowReturn = {
  flowState: VideoCallFlowState.IDLE,
  videoCallError: null,
  localStream: null,
  remoteStream: null,
  isInBackground: false,
  startVideoCall: jest.fn(),
  cleanup: jest.fn().mockResolvedValue(undefined),
  retryConnection: jest.fn().mockResolvedValue(undefined),
  setCallEnded: jest.fn(),
}

const mockFcmViewModel = { processPendingChallenges: jest.fn() } as unknown as FcmViewModel

describe('LiveCall', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockUseVideoCallFlow.mockReturnValue(defaultVideoCallFlowReturn)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const fcmService = new FcmService()
    const tree = render(
      <BasicAppContext>
        <BCSCActivityProvider>
          <FcmServiceProvider service={fcmService} viewModel={mockFcmViewModel}>
            <LiveCallScreen navigation={mockNavigation as never} />
          </FcmServiceProvider>
        </BCSCActivityProvider>
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()

    tree.unmount()
  })

  it('advances progress only on stage changes, resets on retry, and leaves the wait when the call starts', async () => {
    const fcmService = new FcmService()
    const screen = () => (
      <BasicAppContext>
        <BCSCActivityProvider>
          <FcmServiceProvider service={fcmService} viewModel={mockFcmViewModel}>
            <LiveCallScreen navigation={mockNavigation as never} />
          </FcmServiceProvider>
        </BCSCActivityProvider>
      </BasicAppContext>
    )
    const view = render(screen())
    const delayedMessage = 'BCSC.VideoCall.Loading.TakingLongerThanUsual'

    const stages = [
      [VideoCallFlowState.UPLOADING_DOCUMENTS, 0, 'UploadingDocuments'],
      [VideoCallFlowState.CREATING_SESSION, 25, 'CreatingSession'],
      [VideoCallFlowState.CONNECTING_WEBRTC, 50, 'ConnectingWebRTC'],
      [VideoCallFlowState.WAITING_FOR_AGENT, 75, 'WaitingForAgent'],
    ] as const

    for (const [flowState, progress, status] of stages) {
      mockUseVideoCallFlow.mockReturnValue({ ...defaultVideoCallFlowReturn, flowState })
      view.rerender(screen())
      expect(view.getByRole('progressbar', { name: `BCSC.VideoCall.CallStates.${status}` })).toBeTruthy()
      expect(view.UNSAFE_getByType(ProgressBar).props.progressPercent).toBe(progress)
      act(() => jest.advanceTimersByTime(20000))
      expect(view.UNSAFE_getByType(ProgressBar).props.progressPercent).toBe(progress)
    }
    expect(view.getByText(delayedMessage)).toBeTruthy()

    mockUseVideoCallFlow.mockReturnValue({
      ...defaultVideoCallFlowReturn,
      flowState: VideoCallFlowState.ERROR,
      videoCallError: { message: 'Connection failed', retryable: true },
    })
    view.rerender(screen())
    expect(view.queryByRole('progressbar')).toBeNull()
    await act(async () => fireEvent.press(view.getByRole('button', { name: 'BCSC.VideoCall.Errors.TryAgain' })))
    expect(defaultVideoCallFlowReturn.retryConnection).toHaveBeenCalledTimes(1)

    mockUseVideoCallFlow.mockReturnValue({
      ...defaultVideoCallFlowReturn,
      flowState: VideoCallFlowState.UPLOADING_DOCUMENTS,
    })
    view.rerender(screen())
    expect(view.UNSAFE_getByType(ProgressBar).props.progressPercent).toBe(0)
    expect(view.queryByText(delayedMessage)).toBeNull()
    act(() => jest.advanceTimersByTime(9999))
    expect(view.queryByText(delayedMessage)).toBeNull()
    expect(view.queryByRole('button', { name: 'Global.Cancel' })).toBeNull()
    act(() => jest.advanceTimersByTime(1))
    expect(view.getByText(delayedMessage)).toBeTruthy()
    expect(view.getByRole('button', { name: 'Global.Cancel' })).toBeEnabled()

    mockUseVideoCallFlow.mockReturnValue({ ...defaultVideoCallFlowReturn, flowState: VideoCallFlowState.IN_CALL })
    view.rerender(screen())
    expect(view.queryByRole('progressbar')).toBeNull()
    expect(view.queryByText(delayedMessage)).toBeNull()
    view.unmount()
  })

  it('cancels setup after 10 seconds and returns to Start Video Call after cleanup', async () => {
    let finishCleanup!: () => void
    const cleanup = jest.fn(() => new Promise<void>((resolve) => (finishCleanup = resolve)))
    mockUseVideoCallFlow.mockReturnValue({
      ...defaultVideoCallFlowReturn,
      flowState: VideoCallFlowState.CREATING_SESSION,
      cleanup,
    })
    const view = render(
      <BasicAppContext>
        <BCSCActivityProvider>
          <FcmServiceProvider service={new FcmService()} viewModel={mockFcmViewModel}>
            <LiveCallScreen navigation={mockNavigation as never} />
          </FcmServiceProvider>
        </BCSCActivityProvider>
      </BasicAppContext>
    )

    act(() => jest.advanceTimersByTime(10000))
    const cancel = view.getByRole('button', { name: 'Global.Cancel' })
    act(() => {
      fireEvent.press(cancel)
      fireEvent.press(cancel)
    })
    expect(cancel).toBeDisabled()
    expect(cleanup).toHaveBeenCalledTimes(1)
    expect(mockNavigation.navigate).not.toHaveBeenCalled()

    await act(async () => finishCleanup())
    expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.StartCall)
    expect(defaultVideoCallFlowReturn.setCallEnded).not.toHaveBeenCalled()
    expect(mockNavigation.dispatch).not.toHaveBeenCalled()
    view.unmount()
  })

  it('suppresses FCM on mount and re-enables on unmount', () => {
    const fcmService = new FcmService()
    const spy = jest.spyOn(fcmService, 'setSuppressed')

    const tree = render(
      <BasicAppContext>
        <BCSCActivityProvider>
          <FcmServiceProvider service={fcmService} viewModel={mockFcmViewModel}>
            <LiveCallScreen navigation={mockNavigation as never} />
          </FcmServiceProvider>
        </BCSCActivityProvider>
      </BasicAppContext>
    )

    expect(spy).toHaveBeenCalledWith(true)
    spy.mockClear()

    tree.unmount()
    expect(spy).toHaveBeenCalledWith(false)
  })

  describe('crop delay overlay', () => {
    it('shows the calling agent overlay during the crop delay period', () => {
      mockUseVideoCallFlow.mockReturnValue({
        ...defaultVideoCallFlowReturn,
        flowState: VideoCallFlowState.IN_CALL,
      })

      const fcmService = new FcmService()
      const tree = render(
        <BasicAppContext>
          <BCSCActivityProvider>
            <FcmServiceProvider service={fcmService} viewModel={mockFcmViewModel}>
              <LiveCallScreen navigation={mockNavigation as never} />
            </FcmServiceProvider>
          </BCSCActivityProvider>
        </BasicAppContext>
      )

      expect(tree.getByText('BCSC.VideoCall.CallingAgent')).toBeTruthy()

      tree.unmount()
    })

    it('hides the calling agent overlay after CROP_DELAY_MS elapses', () => {
      mockUseVideoCallFlow.mockReturnValue({
        ...defaultVideoCallFlowReturn,
        flowState: VideoCallFlowState.IN_CALL,
      })

      const fcmService = new FcmService()
      const tree = render(
        <BasicAppContext>
          <BCSCActivityProvider>
            <FcmServiceProvider service={fcmService} viewModel={mockFcmViewModel}>
              <LiveCallScreen navigation={mockNavigation as never} />
            </FcmServiceProvider>
          </BCSCActivityProvider>
        </BasicAppContext>
      )

      // Overlay should be visible before the delay
      expect(tree.getByText('BCSC.VideoCall.CallingAgent')).toBeTruthy()

      // Advance timers past the crop delay
      act(() => {
        jest.advanceTimersByTime(CROP_DELAY_MS)
      })

      // Overlay should no longer be rendered
      expect(tree.queryByText('BCSC.VideoCall.CallingAgent')).toBeNull()

      tree.unmount()
    })
  })
})
