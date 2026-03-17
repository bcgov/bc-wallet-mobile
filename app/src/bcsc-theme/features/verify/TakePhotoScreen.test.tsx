import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import TakePhotoScreen from './TakePhotoScreen'

jest.mock('react-native-vision-camera', () => ({
  Camera: 'Camera',
  useCameraDevice: jest.fn().mockReturnValue({ id: 'mock-device' }),
  useCameraPermission: jest.fn().mockReturnValue({ hasPermission: true, requestPermission: jest.fn() }),
  useCameraFormat: jest.fn().mockReturnValue({ videoWidth: 640, videoHeight: 480 }),
  CameraRuntimeError: class extends Error {},
}))

describe('TakePhoto', () => {
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
        <TakePhotoScreen
          navigation={mockNavigation as never}
          route={
            {
              params: {
                deviceSide: 'front',
                cameraLabel: 'Test camera',
                cameraInstructions: 'Please take a photo',
                forLiveCall: false,
              },
            } as any
          }
        />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
