import { BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import * as visionCamera from '@/bcsc-theme/hooks/useVisionCamera'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { removeFileSafely, toMp4VideoPath } from '@/bcsc-theme/utils/file-info'
import { AppError } from '@/errors'
import { TestIds } from '@/test-ids/registry'
import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { useCameraDevice, useCameraPermission, useMicrophonePermission } from 'react-native-vision-camera'
import TakeVideoScreen from './TakeVideoScreen'

// Mock react-native-vision-camera with a forwardRef Camera that renders into the tree (props —
// including `isActive` and `onConfigured` — reachable via the `mock-camera` testID), matching the
// pattern used in CodeScanningCamera.test.tsx / MaskedCamera.test.tsx. Deliberately does NOT
// auto-fire `onConfigured` (unlike those two) so the existing tests below — none of which expect
// the recording countdown to start — are unaffected; only tests that explicitly need the
// post-initialization `isActive` value call `camera.props.onConfigured()` themselves.
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
    // Output hooks used by camera-output.tsx (useSelfiePhotoOutput / useSelfieVideoOutput)
    CommonResolutions: { FHD_16_9: 'FHD_16_9', VGA_16_9: 'VGA_16_9' },
    usePhotoOutput: jest.fn().mockReturnValue({ capturePhotoToFile: jest.fn() }),
    useVideoOutput: jest.fn().mockReturnValue({ setOutputSettings: jest.fn(), createRecorder: jest.fn() }),
  }
})

jest.mock('@/bcsc-theme/utils/file-info', () => ({
  ...jest.requireActual('@/bcsc-theme/utils/file-info'),
  toMp4VideoPath: jest.fn((path: string) => Promise.resolve(path)),
  removeFileSafely: jest.fn(),
}))

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

  describe('Cancel while the recording is still converting to MP4', () => {
    const startAndFinishRecording = async (navigation: ReturnType<typeof useNavigation>) => {
      let recordingCallbacks: Parameters<ReturnType<typeof visionCamera.useVisionCamera>['startRecordingVideo']>[0]
      const realUseVisionCamera = jest.requireActual('@/bcsc-theme/hooks/useVisionCamera').useVisionCamera
      jest.spyOn(visionCamera, 'useVisionCamera').mockImplementation((options) => ({
        ...realUseVisionCamera(options),
        cameraRef: { current: {} },
        takePhoto: jest.fn().mockResolvedValue({ filePath: '/tmp/thumbnail.jpg' }),
        startRecordingVideo: jest.fn(async (callbacks) => {
          recordingCallbacks = callbacks
        }),
        cancelRecordingVideo: jest.fn(),
      }))

      let resolveConversion!: (path: string) => void
      jest.mocked(toMp4VideoPath).mockReturnValue(
        new Promise((resolve) => {
          resolveConversion = resolve
        })
      )

      const screen = render(
        <BasicAppContext initialStateOverride={storeWithPrompts}>
          <TakeVideoScreen navigation={navigation as never} />
        </BasicAppContext>
      )

      act(() => {
        screen.getByTestId('mock-camera').props.onConfigured()
      })
      // useFocusEffect is a no-op mock, so run the latest focus callback by hand to start the countdown
      const focusCallback = jest.mocked(useFocusEffect).mock.calls.at(-1)![0]
      act(() => {
        focusCallback()
      })
      await act(async () => {
        await jest.advanceTimersByTimeAsync(3000)
      })

      act(() => {
        recordingCallbacks!.onRecordingFinished({
          filePath: '/tmp/recording.mov',
          reason: 'stopped',
          duration: 5,
          fileSize: 100,
        } as never)
      })

      return { screen, resolveConversion }
    }

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('does not open Video Review and discards the converted file', async () => {
      const navigation = useNavigation()
      const { screen, resolveConversion } = await startAndFinishRecording(navigation)

      await act(async () => {
        fireEvent.press(screen.getByTestId(testIdWithKey(TestIds.verify.takeVideo.cancel)))
      })
      await act(async () => {
        resolveConversion('/tmp/recording.mp4')
      })

      expect(navigation.goBack).toHaveBeenCalled()
      expect(navigation.navigate).not.toHaveBeenCalledWith(BCSCScreens.VideoReview, expect.anything())
      expect(removeFileSafely).toHaveBeenCalledWith('/tmp/recording.mp4', expect.anything())
    })

    it('opens Video Review when the user does not cancel', async () => {
      const navigation = useNavigation()
      const { resolveConversion } = await startAndFinishRecording(navigation)

      await act(async () => {
        resolveConversion('/tmp/recording.mp4')
      })

      expect(navigation.navigate).toHaveBeenCalledWith(BCSCScreens.VideoReview, {
        videoPath: '/tmp/recording.mp4',
        videoThumbnailPath: '/tmp/thumbnail.jpg',
      })
    })

    it('does not open Video Review after the screen unmounts', async () => {
      const navigation = useNavigation()
      const { screen, resolveConversion } = await startAndFinishRecording(navigation)

      screen.unmount()
      await act(async () => {
        resolveConversion('/tmp/recording.mp4')
      })

      expect(navigation.navigate).not.toHaveBeenCalledWith(BCSCScreens.VideoReview, expect.anything())
    })
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
        camera.props.onConfigured()
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
        camera.props.onConfigured()
      })

      expect(getByTestId('mock-camera').props.isActive).toBe(true)
    })

    it('stays active when appStateStatus is an unexpected value like unknown (fail-safe default)', () => {
      mockUseBCSCActivity.mockReturnValue({ appStateStatus: 'unknown' })

      const navigation = useNavigation()
      const { getByTestId } = render(
        <BasicAppContext initialStateOverride={storeWithPrompts}>
          <TakeVideoScreen navigation={navigation as never} />
        </BasicAppContext>
      )

      const camera = getByTestId('mock-camera')

      act(() => {
        camera.props.onConfigured()
      })

      // The gate deactivates on KNOWN background states rather than activating only on a
      // known-active one, so an unexpected value can't strand the camera off permanently.
      expect(getByTestId('mock-camera').props.isActive).toBe(true)
    })
  })
})
