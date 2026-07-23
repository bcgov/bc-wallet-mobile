import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { useCameraPermission } from 'react-native-vision-camera'
import ScanSerialScreen from './ScanSerialScreen'

// Mock react-native-vision-camera
jest.mock('react-native-vision-camera', () => ({
  Camera: 'Camera',
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
  useCodeScanner: jest.fn((config) => config),
}))

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
    ;(useCameraPermission as jest.Mock).mockReturnValue({
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
    ;(useCameraPermission as jest.Mock).mockReturnValue({
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

  it('offers manual entry when the camera errors out', async () => {
    const { UNSAFE_root, getByTestId } = render(
      <BasicAppContext>
        <ScanSerialScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    const cameraNode = UNSAFE_root.findAll((node) => typeof node.props.onError === 'function')[0]

    act(() => {
      cameraNode.props.onError(new Error('camera/unknown'))
    })

    expect(getByTestId(testIdWithKey('EnterManually'))).toBeTruthy()
    expect(getByTestId(testIdWithKey('RetryCamera'))).toBeTruthy()
  })
})
