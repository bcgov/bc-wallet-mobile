import { BCSCActivityProvider } from '@/bcsc-theme/contexts/BCSCActivityContext'
import { FcmService, FcmServiceProvider, FcmViewModel } from '@/bcsc-theme/features/fcm'
import { VideoCallFlowState } from '@/bcsc-theme/features/verify/live-call/types/live-call'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import ProgressBar from '@/components/ProgressBar'
import { CROP_DELAY_MS } from '@/constants'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { Platform } from 'react-native'
import { VolumeManager, VolumeResult } from 'react-native-volume-manager'
import LiveCallScreen from './LiveCallScreen'

const mockUseVideoCallFlow = jest.fn()
jest.mock('./hooks/useVideoCallFlow', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseVideoCallFlow(...args),
}))

const mockGetServiceHours = jest.fn()
jest.mock('@/bcsc-theme/api/hooks/useApi', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    video: {
      getServiceHours: mockGetServiceHours,
    },
  })),
}))

const defaultVideoCallFlowReturn = {
  flowState: VideoCallFlowState.IDLE,
  videoCallError: null,
  serviceUnavailable: null,
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

  describe('service unavailable', () => {
    const renderScreen = () =>
      render(
        <BasicAppContext>
          <BCSCActivityProvider>
            <FcmServiceProvider service={new FcmService()} viewModel={mockFcmViewModel}>
              <LiveCallScreen navigation={mockNavigation as never} />
            </FcmServiceProvider>
          </BCSCActivityProvider>
        </BasicAppContext>
      )

    it.each([true, false])('routes to CallBusyOrClosed with busy=%s', async (busy) => {
      mockGetServiceHours.mockResolvedValue({
        time_zone: 'America/Vancouver',
        regular_service_periods: [],
        service_unavailable_periods: [],
      })
      mockUseVideoCallFlow.mockReturnValue({
        ...defaultVideoCallFlowReturn,
        flowState: VideoCallFlowState.CREATING_SESSION,
        serviceUnavailable: { busy },
      })

      const tree = renderScreen()

      await waitFor(() => expect(mockNavigation.dispatch).toHaveBeenCalled())
      const action = mockNavigation.dispatch.mock.calls[0][0]
      expect(action.payload.routes).toEqual([
        { name: BCSCScreens.VerificationMethodSelection },
        { name: BCSCScreens.CallBusyOrClosed, params: { busy, formattedHours: expect.any(Array) } },
      ])

      tree.unmount()
    })

    it('does not navigate if the screen unmounts while service hours are loading', async () => {
      let resolveHours: (value: unknown) => void = () => {}
      mockGetServiceHours.mockReturnValue(new Promise((resolve) => (resolveHours = resolve)))
      mockUseVideoCallFlow.mockReturnValue({
        ...defaultVideoCallFlowReturn,
        flowState: VideoCallFlowState.CREATING_SESSION,
        serviceUnavailable: { busy: true },
      })

      const tree = renderScreen()
      tree.unmount()

      await act(async () => {
        resolveHours({ time_zone: 'America/Vancouver', regular_service_periods: [], service_unavailable_periods: [] })
      })

      expect(mockNavigation.dispatch).not.toHaveBeenCalled()
    })

    it('still routes to CallBusyOrClosed when service hours fail to load', async () => {
      mockGetServiceHours.mockRejectedValue(new Error('network'))
      mockUseVideoCallFlow.mockReturnValue({
        ...defaultVideoCallFlowReturn,
        flowState: VideoCallFlowState.CREATING_SESSION,
        serviceUnavailable: { busy: true },
      })

      const tree = renderScreen()

      await waitFor(() => expect(mockNavigation.dispatch).toHaveBeenCalled())
      const action = mockNavigation.dispatch.mock.calls[0][0]
      expect(action.payload.routes[1]).toEqual({
        name: BCSCScreens.CallBusyOrClosed,
        params: { busy: true, formattedHours: [] },
      })

      tree.unmount()
    })
  })

  describe('low volume banner', () => {
    const originalOS = Platform.OS

    const renderInCall = () => {
      mockUseVideoCallFlow.mockReturnValue({
        ...defaultVideoCallFlowReturn,
        flowState: VideoCallFlowState.IN_CALL,
      })

      return render(
        <BasicAppContext>
          <BCSCActivityProvider>
            <FcmServiceProvider service={new FcmService()} viewModel={mockFcmViewModel}>
              <LiveCallScreen navigation={mockNavigation as never} />
            </FcmServiceProvider>
          </BCSCActivityProvider>
        </BasicAppContext>
      )
    }

    const emitVolume = (result: VolumeResult) => {
      const listener = jest.mocked(VolumeManager.addVolumeListener).mock.lastCall![0]
      act(() => listener(result))
    }

    afterEach(() => {
      Platform.OS = originalOS
    })

    it('uses the call stream for the initial volume on Android', async () => {
      Platform.OS = 'android'
      jest.mocked(VolumeManager.getVolume).mockResolvedValueOnce({ volume: 1, call: 0.1 } as VolumeResult)

      const tree = renderInCall()

      expect(await tree.findByText('BCSC.VideoCall.Banners.VolumeLow')).toBeTruthy()

      tree.unmount()
    })

    it('ignores volume events for other streams on Android', async () => {
      Platform.OS = 'android'
      const tree = renderInCall()
      await act(async () => {})

      emitVolume({ volume: 0.1, type: 'music' })
      expect(tree.queryByText('BCSC.VideoCall.Banners.VolumeLow')).toBeNull()

      emitVolume({ volume: 0.1, type: 'call' })
      expect(tree.getByText('BCSC.VideoCall.Banners.VolumeLow')).toBeTruthy()

      tree.unmount()
    })

    it('uses every volume event on iOS', async () => {
      Platform.OS = 'ios'
      const tree = renderInCall()
      await act(async () => {})

      emitVolume({ volume: 0.1 })
      expect(tree.getByText('BCSC.VideoCall.Banners.VolumeLow')).toBeTruthy()

      tree.unmount()
    })
  })
})
