import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import TakePhotoScreen from './TakePhotoScreen'

jest.mock('react-native-vision-camera', () => ({
  Camera: 'Camera',
  useCameraDevice: jest.fn().mockReturnValue({ id: 'mock-device' }),
  useCameraPermission: jest.fn().mockReturnValue({ hasPermission: true, requestPermission: jest.fn() }),
  // Output hooks used by camera-output.tsx (useSelfiePhotoOutput)
  CommonResolutions: { FHD_16_9: 'FHD_16_9' },
  usePhotoOutput: jest.fn().mockReturnValue({ capturePhotoToFile: jest.fn() }),
}))

// MaskedCamera reads appStateStatus from BCSCActivityContext, which BasicAppContext doesn't provide.
jest.mock('@/bcsc-theme/contexts/BCSCActivityContext', () => ({
  useBCSCActivity: jest.fn().mockReturnValue({
    appStateStatus: 'active',
    pauseActivityTracking: jest.fn(),
    resumeActivityTracking: jest.fn(),
  }),
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
