import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { useCameraPermission } from 'react-native-vision-camera'
import ScanSerialScreen from './ScanSerialScreen'

/** testID on the mocked Camera host element, so tests can drive its props directly. */
const VISION_CAMERA_TEST_ID = 'vision-camera'

// Mock react-native-vision-camera. Camera renders a host element carrying the props
// CodeScanningCamera passes it (notably onError), so tests can exercise the real
// Camera -> handleCameraError -> onError path.
jest.mock('react-native-vision-camera', () => {
  const ReactActual = jest.requireActual<typeof React>('react')

  return {
    Camera: ReactActual.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) =>
      ReactActual.createElement('VisionCamera', { ...props, ref, testID: 'vision-camera' })
    ),
    useCameraDevice: jest.fn(() => ({
      id: 'back',
      supportsFocus: true,
      minZoom: 1,
      maxZoom: 8,
      neutralZoom: 1,
      hasTorch: true,
    })),
    useCameraFormat: jest.fn(() => ({})),
    useCameraPermission: jest.fn(() => ({
      hasPermission: true,
      requestPermission: jest.fn(),
    })),
    useCodeScanner: jest.fn((config: unknown) => config),
  }
})

const mockUseCameraPermission = useCameraPermission as jest.Mock

// Mock BCSCActivityContext — not provided by BasicAppContext
jest.mock('../../contexts/BCSCActivityContext', () => ({
  useBCSCActivity: jest.fn(() => ({
    appStateStatus: 'active',
    pauseActivityTracking: jest.fn(),
    resumeActivityTracking: jest.fn(),
  })),
}))

// LoadingScreen (shown while the permission prompt is pending) needs a provider BasicAppContext doesn't supply
jest.mock('../../contexts/BCSCLoadingContext', () => ({
  ...jest.requireActual('../../contexts/BCSCLoadingContext'),
  LoadingScreen: () => null,
}))

// Mock gesture handler
const mockGestureChain = () => {
  const chain: any = {}
  chain.enabled = jest.fn().mockReturnValue(chain)
  chain.onBegin = jest.fn().mockReturnValue(chain)
  chain.onUpdate = jest.fn().mockReturnValue(chain)
  chain.onEnd = jest.fn().mockReturnValue(chain)
  return chain
}

jest.mock('react-native-gesture-handler', () => ({
  Gesture: {
    Pinch: () => mockGestureChain(),
    Tap: () => mockGestureChain(),
    Simultaneous: (...gestures: any[]) => gestures,
  },
  GestureDetector: ({ children }: any) => children,
}))

describe('ScanSerial', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockUseCameraPermission.mockReturnValue({
      hasPermission: true,
      requestPermission: jest.fn().mockResolvedValue(true),
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <ScanSerialScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('offers manual entry when camera permission is denied', async () => {
    mockUseCameraPermission.mockReturnValue({
      hasPermission: false,
      requestPermission: jest.fn().mockResolvedValue(false),
    })

    const { getByTestId } = render(
      <BasicAppContext>
        <ScanSerialScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    await waitFor(() => expect(getByTestId(testIdWithKey('EnterManually'))).toBeTruthy())
    expect(getByTestId(testIdWithKey('OpenSettings'))).toBeTruthy()
  })

  it('offers manual entry when the camera errors out', () => {
    const { getByTestId } = render(
      <BasicAppContext>
        <ScanSerialScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    // Fire the error off the Camera itself so the whole
    // Camera -> handleCameraError -> onError chain runs.
    act(() => {
      getByTestId(VISION_CAMERA_TEST_ID).props.onError(
        Object.assign(new Error('The camera has been disconnected'), {
          code: 'system/camera-has-been-disconnected',
        })
      )
    })

    expect(getByTestId(testIdWithKey('EnterManually'))).toBeTruthy()
    expect(getByTestId(testIdWithKey('RetryCamera'))).toBeTruthy()
  })
})
