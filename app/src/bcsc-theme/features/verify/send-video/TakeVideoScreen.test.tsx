import { useNavigation } from '@react-navigation/native'
import { render } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '@mocks/helpers/app'

import { useCameraDevice, useCameraPermission, useMicrophonePermission } from 'react-native-vision-camera'
import TakeVideoScreen from './TakeVideoScreen'

jest.mock('react-native-vision-camera', () => ({
  Camera: 'Camera',
  useCameraDevice: jest.fn().mockReturnValue({ id: 'mock-device' }),
  useCameraPermission: jest.fn().mockReturnValue({ hasPermission: true, requestPermission: jest.fn() }),
  useMicrophonePermission: jest.fn().mockReturnValue({ hasPermission: true, requestPermission: jest.fn() }),
  useCameraFormat: jest.fn().mockReturnValue({ videoWidth: 640, videoHeight: 480, fps: 24 }),
  CameraRuntimeError: class extends Error {},
}))

describe('TakeVideoScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  test('renders correctly', () => {
    const navigation = useNavigation()
    const tree = render(
      <BasicAppContext>
        <TakeVideoScreen navigation={navigation as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  test('renders no camera message when device is unavailable', () => {
    // @ts-expect-error - useCameraDevice is mocked
    useCameraDevice.mockReturnValue(undefined)

    const navigation = useNavigation()
    const { getByText } = render(
      <BasicAppContext>
        <TakeVideoScreen navigation={navigation as never} />
      </BasicAppContext>
    )

    expect(getByText('BCSC.SendVideo.TakeVideo.NoFrontCameraAvailable')).toBeTruthy()
  })

  test('renders permission required message when permissions are denied', () => {
    // @ts-expect-error - useCameraPermission is mocked
    useCameraPermission.mockReturnValue({ hasPermission: false, requestPermission: jest.fn() })
    // @ts-expect-error - useMicrophonePermission is mocked
    useMicrophonePermission.mockReturnValue({ hasPermission: false, requestPermission: jest.fn() })

    const navigation = useNavigation()
    const { getByText } = render(
      <BasicAppContext>
        <TakeVideoScreen navigation={navigation as never} />
      </BasicAppContext>
    )

    expect(getByText('BCSC.SendVideo.TakeVideo.CameraAndMicrophonePermissionsRequired')).toBeTruthy()
  })
})
