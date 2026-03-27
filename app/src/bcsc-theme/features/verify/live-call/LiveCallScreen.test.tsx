import { BCSCActivityProvider } from '@/bcsc-theme/contexts/BCSCActivityContext'
import { FcmService, FcmServiceProvider, FcmViewModel } from '@/bcsc-theme/features/fcm'
import { VideoCallFlowState } from '@/bcsc-theme/features/verify/live-call/types/live-call'
import { CROP_DELAY_MS } from '@/constants'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, render } from '@testing-library/react-native'
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
