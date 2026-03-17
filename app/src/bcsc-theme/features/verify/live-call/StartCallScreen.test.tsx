import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import StartCallScreen from './StartCallScreen'

jest.mock('react-native-vision-camera', () => ({
  Camera: 'Camera',
  useCameraDevice: jest.fn().mockReturnValue({ id: 'mock-device' }),
  useCameraPermission: jest.fn().mockReturnValue({ hasPermission: true, requestPermission: jest.fn() }),
  useMicrophonePermission: jest.fn().mockReturnValue({ hasPermission: true, requestPermission: jest.fn() }),
  useCameraFormat: jest.fn().mockReturnValue({ videoWidth: 640, videoHeight: 480, fps: 24 }),
  CameraRuntimeError: class extends Error {},
}))

describe('StartCall', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <StartCallScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
