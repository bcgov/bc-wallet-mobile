import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { useFocusEffect } from '@react-navigation/native'
import { act, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { useCameraDevice, useCameraPermission } from 'react-native-vision-camera'
import ScanSerialScreen from './ScanSerialScreen'

jest.mock('@/bcsc-theme/api/hooks/useApi')

/** testID on the mocked Camera host element, so tests can drive its props directly. */
const VISION_CAMERA_TEST_ID = 'vision-camera'

/** Called once per mount of the mocked Camera, so tests can assert how often the camera is (re)created. */
const mockCameraMount = jest.fn()

// Mock react-native-vision-camera. Camera renders a host element carrying the props
// CodeScanningCamera passes it (notably onError), so tests can exercise the real
// Camera -> handleCameraError -> onError path.
jest.mock('react-native-vision-camera', () => {
  const ReactActual = jest.requireActual<typeof React>('react')

  return {
    Camera: ReactActual.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
      ReactActual.useEffect(() => {
        mockCameraMount()
      }, [])
      return ReactActual.createElement('VisionCamera', { ...props, ref, testID: 'vision-camera' })
    }),
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
const mockUseCameraDevice = useCameraDevice as jest.Mock
const mockUseFocusEffect = useFocusEffect as jest.Mock

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

  describe('torch button (regression: iPad device/flash-unavailable in 4.1.0)', () => {
    const defaultDevice = {
      id: 'back',
      supportsFocus: true,
      minZoom: 1,
      maxZoom: 8,
      neutralZoom: 1,
      hasTorch: true,
    }

    afterEach(() => {
      mockUseCameraDevice.mockImplementation(() => defaultDevice)
    })

    it('shows the torch button when the camera device has a torch', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <ScanSerialScreen navigation={mockNavigation as never} />
        </BasicAppContext>
      )

      expect(getByTestId(testIdWithKey('ScanTorch'))).toBeTruthy()
    })

    it('hides the torch button when the camera device has no torch', () => {
      mockUseCameraDevice.mockReturnValue({ ...defaultDevice, hasTorch: false })

      const { queryByTestId, getByTestId } = render(
        <BasicAppContext>
          <ScanSerialScreen navigation={mockNavigation as never} />
        </BasicAppContext>
      )

      // Tapping it would make VisionCamera throw `device/flash-unavailable` and fail the
      // screen over to the camera error state, so the control must not be offered at all.
      expect(queryByTestId(testIdWithKey('ScanTorch'))).toBeNull()
      expect(getByTestId(testIdWithKey('EnterManually'))).toBeTruthy()
    })
  })

  describe('camera mount on focus (regression: double mount on entry in 4.1.0)', () => {
    type FocusEffect = () => void | (() => void)
    /** Effects registered through the mocked useFocusEffect, with their pending cleanups. */
    const focusEffects = new Map<FocusEffect, void | (() => void)>()

    beforeEach(() => {
      focusEffects.clear()
      // Run focus effects the way react-navigation does for a screen that is already focused:
      // on mount and whenever the effect identity changes, with cleanup on unmount.
      mockUseFocusEffect.mockImplementation((effect: FocusEffect) => {
        React.useEffect(() => {
          focusEffects.set(effect, effect())
          return () => {
            focusEffects.get(effect)?.()
            focusEffects.delete(effect)
          }
        }, [effect])
      })
    })

    afterEach(() => {
      mockUseFocusEffect.mockImplementation(() => undefined)
    })

    /** Simulate the screen blurring and regaining focus: run every cleanup, then every effect again. */
    const refocusScreen = () =>
      act(() => {
        for (const [effect, cleanup] of Array.from(focusEffects)) {
          cleanup?.()
          focusEffects.set(effect, effect())
        }
      })

    it('mounts the camera once when the screen first gains focus', () => {
      render(
        <BasicAppContext>
          <ScanSerialScreen navigation={mockNavigation as never} />
        </BasicAppContext>
      )

      // Remounting on the initial focus tore down and recreated the native capture session
      // back-to-back, leaving two sessions briefly overlapping on the same device.
      expect(mockCameraMount).toHaveBeenCalledTimes(1)
    })

    it('remounts the camera when the screen regains focus so a previous scan is reset', () => {
      render(
        <BasicAppContext>
          <ScanSerialScreen navigation={mockNavigation as never} />
        </BasicAppContext>
      )
      expect(mockCameraMount).toHaveBeenCalledTimes(1)

      refocusScreen()

      expect(mockCameraMount).toHaveBeenCalledTimes(2)
    })
  })
})
