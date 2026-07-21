import { BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { AppError } from '@/errors'
import { BasicAppContext } from '@mocks/helpers/app'
import { useNavigation } from '@react-navigation/native'
import { act, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { useCameraDevice, useCameraPermission, useMicrophonePermission } from 'react-native-vision-camera'
import TakeVideoScreen from './TakeVideoScreen'

// Mock react-native-vision-camera with a forwardRef Camera that renders into the tree (props —
// including `isActive` and `onInitialized` — reachable via the `mock-camera` testID), matching the
// pattern used in CodeScanningCamera.test.tsx / MaskedCamera.test.tsx. Deliberately does NOT
// auto-fire `onInitialized` (unlike those two) so the existing tests below — none of which expect
// the recording countdown to start — are unaffected; only tests that explicitly need the
// post-initialization `isActive` value call `camera.props.onInitialized()` themselves.
jest.mock('react-native-vision-camera', () => {
  const React = jest.requireActual('react')
  const { View } = jest.requireActual('react-native')

  // eslint-disable-next-line react/display-name
  const MockCamera = React.forwardRef(({ children, ...props }: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      takePhoto: jest.fn().mockResolvedValue({ path: '/tmp/thumbnail.jpg' }),
      startRecording: jest.fn(),
      stopRecording: jest.fn(),
      cancelRecording: jest.fn(),
    }))

    return (
      <View testID="mock-camera" {...props}>
        {children}
      </View>
    )
  })

  return {
    Camera: MockCamera,
    useCameraDevice: jest.fn().mockReturnValue({ id: 'mock-device' }),
    useCameraPermission: jest.fn().mockReturnValue({ hasPermission: true, requestPermission: jest.fn() }),
    useMicrophonePermission: jest.fn().mockReturnValue({ hasPermission: true, requestPermission: jest.fn() }),
    useCameraFormat: jest.fn().mockReturnValue({ videoWidth: 640, videoHeight: 480, fps: 24 }),
    CameraRuntimeError: class extends Error {},
    CameraCaptureError: class extends Error {},
  }
})

// Mock BCSCActivityContext — not provided by BasicAppContext
const mockUseBCSCActivity = jest.fn(() => ({ appStateStatus: 'active' }))
jest.mock('@/bcsc-theme/contexts/BCSCActivityContext', () => ({
  useBCSCActivity: () => mockUseBCSCActivity(),
}))

const storeWithPrompts = {
  bcsc: {
    prompts: [
      { id: 1, prompt: 'Say your name' },
      { id: 2, prompt: 'Show your face' },
    ],
  },
} as any

describe('TakeVideoScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    // clearAllMocks (below) clears call history but not a mockReturnValue implementation, so
    // reset defaults explicitly each test — several tests below permanently override these via
    // .mockReturnValue(...) (not Once), which would otherwise leak into later tests.
    mockUseBCSCActivity.mockReturnValue({ appStateStatus: 'active' })
    // @ts-expect-error - useCameraDevice is mocked
    useCameraDevice.mockReturnValue({ id: 'mock-device' })
    // @ts-expect-error - useCameraPermission is mocked
    useCameraPermission.mockReturnValue({ hasPermission: true, requestPermission: jest.fn() })
    // @ts-expect-error - useMicrophonePermission is mocked
    useMicrophonePermission.mockReturnValue({ hasPermission: true, requestPermission: jest.fn() })
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  test('renders correctly', () => {
    const navigation = useNavigation()
    const tree = render(
      <BasicAppContext initialStateOverride={storeWithPrompts}>
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
      <BasicAppContext initialStateOverride={storeWithPrompts}>
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
      <BasicAppContext initialStateOverride={storeWithPrompts}>
        <BCSCLoadingProvider>
          <TakeVideoScreen navigation={navigation as never} />
        </BCSCLoadingProvider>
      </BasicAppContext>
    )

    // Wait for the permission request to complete and loading state to resolve
    await waitFor(() => {
      expect(getByText('BCSC.PermissionDisabled.CameraAndMicrophoneTitle')).toBeTruthy()
    })
  })

  test('throws a coded AppError (2412) when prompts are missing', () => {
    // Regression for #4018: the backstop should report a specific code (2412) via the ErrorBoundary
    // instead of the catch-all 9999.
    const navigation = useNavigation()
    let caught: unknown

    try {
      render(
        <BasicAppContext initialStateOverride={{ bcsc: { prompts: [] } } as any}>
          <TakeVideoScreen navigation={navigation as never} />
        </BasicAppContext>
      )
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(AppError)
    expect((caught as AppError).statusCode).toBe(2412)
  })

  describe('Background / foreground camera lifecycle (regression for #4256)', () => {
    it('deactivates the camera when the app goes to the background, even once the camera has initialized', () => {
      mockUseBCSCActivity.mockReturnValue({ appStateStatus: 'background' })

      const navigation = useNavigation()
      const { getByTestId } = render(
        <BasicAppContext initialStateOverride={storeWithPrompts}>
          <TakeVideoScreen navigation={navigation as never} />
        </BasicAppContext>
      )

      const camera = getByTestId('mock-camera')

      // Before initialization, the local `isActive` state is false, so isActive is already false
      // regardless of appStateStatus — confirm the background case holds once isActive(state) also
      // flips true, which is the scenario this fix actually targets (mid-session backgrounding).
      act(() => {
        camera.props.onInitialized()
      })

      expect(getByTestId('mock-camera').props.isActive).toBe(false)
    })

    it('activates the camera once initialized while the app is in the foreground', () => {
      const navigation = useNavigation()
      const { getByTestId } = render(
        <BasicAppContext initialStateOverride={storeWithPrompts}>
          <TakeVideoScreen navigation={navigation as never} />
        </BasicAppContext>
      )

      const camera = getByTestId('mock-camera')

      expect(camera.props.isActive).toBe(false)

      act(() => {
        camera.props.onInitialized()
      })

      expect(getByTestId('mock-camera').props.isActive).toBe(true)
    })
  })
})
