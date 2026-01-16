import { DeviceVerificationOption } from '@/bcsc-theme/api/hooks/useAuthorizationApi'
import { render } from '@testing-library/react-native'
import React from 'react'

import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import useVerificationMethodModel from './_models/useVerificationMethodModel'
import VerificationMethodSelectionScreen from './VerificationMethodSelectionScreen'

jest.mock('./_models/useVerificationMethodModel')

describe('VerificationMethodSelection', () => {
  let mockNavigation: any
  const mockHandlePressSendVideo = jest.fn()
  const mockHandlePressLiveCall = jest.fn()

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly with send_video as primary option', () => {
    jest.mocked(useVerificationMethodModel).mockReturnValue({
      handlePressSendVideo: mockHandlePressSendVideo,
      handlePressLiveCall: mockHandlePressLiveCall,
      sendVideoLoading: false,
      liveCallLoading: false,
      verificationOptions: [
        DeviceVerificationOption.SEND_VIDEO,
        DeviceVerificationOption.LIVE_VIDEO_CALL,
        DeviceVerificationOption.IN_PERSON,
      ],
    })

    const tree = render(
      <BasicAppContext>
        <VerificationMethodSelectionScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('renders correctly with video_call as primary option', () => {
    jest.mocked(useVerificationMethodModel).mockReturnValue({
      handlePressSendVideo: mockHandlePressSendVideo,
      handlePressLiveCall: mockHandlePressLiveCall,
      sendVideoLoading: false,
      liveCallLoading: false,
      verificationOptions: [
        DeviceVerificationOption.LIVE_VIDEO_CALL,
        DeviceVerificationOption.SEND_VIDEO,
        DeviceVerificationOption.IN_PERSON,
      ],
    })

    const tree = render(
      <BasicAppContext>
        <VerificationMethodSelectionScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('renders correctly with in_person as primary option', () => {
    jest.mocked(useVerificationMethodModel).mockReturnValue({
      handlePressSendVideo: mockHandlePressSendVideo,
      handlePressLiveCall: mockHandlePressLiveCall,
      sendVideoLoading: false,
      liveCallLoading: false,
      verificationOptions: [
        DeviceVerificationOption.IN_PERSON,
        DeviceVerificationOption.SEND_VIDEO,
        DeviceVerificationOption.LIVE_VIDEO_CALL,
      ],
    })

    const tree = render(
      <BasicAppContext>
        <VerificationMethodSelectionScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
