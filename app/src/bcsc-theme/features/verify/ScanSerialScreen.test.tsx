import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
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

// Mock react-native-reanimated (must include Easing etc. — @bifold/core → gifted-chat loads at import)
jest.mock('react-native-reanimated', () => {
  const Easing = {
    linear: (t: number) => t,
    bezier: () => (t: number) => t,
  }
  return {
    __esModule: true,
    default: {
      addWhitelistedNativeProps: jest.fn(),
      createAnimatedComponent: (component: any) => component,
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      View: require('react-native').View,
    },
    Easing,
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (factory: () => any) => factory(),
    useAnimatedProps: (factory: () => any) => factory(),
    withTiming: (toValue: unknown) => toValue,
    interpolate: jest.fn((value: number) => value),
    Extrapolation: { CLAMP: 'clamp' },
    runOnJS: (fn: any) => fn,
  }
})

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
})
