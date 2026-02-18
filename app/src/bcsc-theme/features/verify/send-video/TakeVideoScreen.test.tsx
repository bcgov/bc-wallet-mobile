import { BasicAppContext } from '@mocks/helpers/app'
import { useNavigation } from '@react-navigation/native'
import { render, waitFor } from '@testing-library/react-native'
import React from 'react'
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

  test('renders permission required message when permissions are denied', async () => {
    // @ts-expect-error - useCameraPermission is mocked
    useCameraPermission.mockReturnValue({ hasPermission: false, requestPermission: jest.fn().mockResolvedValue(false) })
    // @ts-expect-error - useMicrophonePermission is mocked
    useMicrophonePermission.mockReturnValue({
      hasPermission: false,
      requestPermission: jest.fn().mockResolvedValue(false),
    })

    const navigation = useNavigation()
    const { getByText } = render(
      <BasicAppContext>
        <TakeVideoScreen navigation={navigation as never} />
      </BasicAppContext>
    )

    // Wait for the permission request to complete and loading state to resolve
    await waitFor(() => {
      expect(getByText('BCSC.PermissionDisabled.CameraAndMicrophoneTitle')).toBeTruthy()
    })
  })
})
