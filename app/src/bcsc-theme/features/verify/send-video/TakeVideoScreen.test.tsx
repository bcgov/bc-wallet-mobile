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
import { Alert } from 'react-native'
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

type RecordingCallbacks = Parameters<ReturnType<typeof visionCamera.useVisionCamera>['startRecordingVideo']>[0]

// Renders the screen with a mocked recorder and runs the countdown (by default all of it, so the
// first prompt is showing)
const startRecordingScreen = async (navigation: ReturnType<typeof useNavigation>, countdownMs = 3000) => {
  let recordingCallbacks: RecordingCallbacks | undefined
  const recorder = {
    takePhoto: jest.fn().mockResolvedValue({ filePath: '/tmp/thumbnail.jpg' }),
    startRecordingVideo: jest.fn(async (callbacks: RecordingCallbacks) => {
      recordingCallbacks = callbacks
    }),
    stopRecordingVideo: jest.fn(),
    cancelRecordingVideo: jest.fn().mockResolvedValue(undefined),
  }
  const realUseVisionCamera = jest.requireActual('@/bcsc-theme/hooks/useVisionCamera').useVisionCamera
  jest.spyOn(visionCamera, 'useVisionCamera').mockImplementation((options) => ({
    ...realUseVisionCamera(options),
    cameraRef: { current: {} },
    ...recorder,
  }))

  const makeTree = () => (
    <BasicAppContext initialStateOverride={storeWithPrompts}>
      <TakeVideoScreen navigation={navigation as never} />
    </BasicAppContext>
  )
  const screen = render(makeTree())

  act(() => {
    screen.getByTestId('mock-camera').props.onConfigured()
    // The mock camera never starts on its own; without this the 8 s not-ready timeout fires mid-test
    screen.getByTestId('mock-camera').props.onStarted()
  })
  // useFocusEffect is a no-op mock, so run the latest focus callback by hand to start the countdown
  const focusCallback = jest.mocked(useFocusEffect).mock.calls.at(-1)![0]
  act(() => {
    focusCallback()
  })
  await act(async () => {
    await jest.advanceTimersByTimeAsync(countdownMs)
  })

  // A new element each time, so React re-renders the screen with the latest mocked app state
  const rerender = () => screen.rerender(makeTree())

  return { screen, rerender, recorder, getRecordingCallbacks: () => recordingCallbacks! }
}

const nextPromptButton = (screen: ReturnType<typeof render>) =>
  screen.getByTestId(testIdWithKey(TestIds.verify.takeVideo.nextPrompt))

const advanceSeconds = async (seconds: number) => {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(seconds * 1000)
  })
}

// Shows both prompts for long enough and presses Done, like a user finishing the recording
const recordUntilDone = async (screen: ReturnType<typeof render>) => {
  await advanceSeconds(2)
  await act(async () => {
    fireEvent.press(nextPromptButton(screen))
  })
  await advanceSeconds(4)
  await act(async () => {
    fireEvent.press(nextPromptButton(screen))
  })
}

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
      let resolveConversion!: (path: string) => void
      jest.mocked(toMp4VideoPath).mockReturnValue(
        new Promise((resolve) => {
          resolveConversion = resolve
        })
      )

      const { screen, getRecordingCallbacks } = await startRecordingScreen(navigation)
      await recordUntilDone(screen)

      act(() => {
        getRecordingCallbacks().onRecordingFinished({
          filePath: '/tmp/recording.mov',
          reason: 'stopped',
          duration: 6,
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

  describe('Recorder fails to start', () => {
    const startRecordingThatFails = async (navigation: ReturnType<typeof useNavigation>) => {
      const realUseVisionCamera = jest.requireActual('@/bcsc-theme/hooks/useVisionCamera').useVisionCamera
      jest.spyOn(visionCamera, 'useVisionCamera').mockImplementation((options) => ({
        ...realUseVisionCamera(options),
        cameraRef: { current: {} },
        takePhoto: jest.fn().mockResolvedValue({ filePath: '/tmp/thumbnail.jpg' }),
        startRecordingVideo: jest.fn().mockRejectedValue(new Error('recorder failed to start')),
        cancelRecordingVideo: jest.fn(),
      }))

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

      return screen
    }

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('stops the timer, discards the thumbnail and goes back', async () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval')
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval')
      const navigation = useNavigation()
      const screen = await startRecordingThatFails(navigation)

      const timerCall = setIntervalSpy.mock.calls.findIndex(([, delay]) => delay === 1000)
      expect(clearIntervalSpy).toHaveBeenCalledWith(setIntervalSpy.mock.results[timerCall].value)
      expect(navigation.goBack).toHaveBeenCalled()
      expect(removeFileSafely).toHaveBeenCalledWith('/tmp/thumbnail.jpg', expect.anything())
      expect(screen.queryByTestId(testIdWithKey(TestIds.verify.takeVideo.cancel))).toBeNull()
    })

    it('does not go back again when the screen has already unmounted', async () => {
      const navigation = useNavigation()
      let rejectStart!: (error: Error) => void
      const realUseVisionCamera = jest.requireActual('@/bcsc-theme/hooks/useVisionCamera').useVisionCamera
      jest.spyOn(visionCamera, 'useVisionCamera').mockImplementation((options) => ({
        ...realUseVisionCamera(options),
        cameraRef: { current: {} },
        takePhoto: jest.fn().mockResolvedValue({ filePath: '/tmp/thumbnail.jpg' }),
        startRecordingVideo: jest.fn(
          () =>
            new Promise<void>((_, reject) => {
              rejectStart = reject
            })
        ),
        cancelRecordingVideo: jest.fn(),
      }))

      const screen = render(
        <BasicAppContext initialStateOverride={storeWithPrompts}>
          <TakeVideoScreen navigation={navigation as never} />
        </BasicAppContext>
      )
      act(() => {
        screen.getByTestId('mock-camera').props.onConfigured()
      })
      const focusCallback = jest.mocked(useFocusEffect).mock.calls.at(-1)![0]
      act(() => {
        focusCallback()
      })
      await act(async () => {
        await jest.advanceTimersByTimeAsync(3000)
      })

      screen.unmount()
      await act(async () => {
        rejectStart(new Error('recorder failed to start'))
      })

      expect(navigation.goBack).not.toHaveBeenCalled()
      expect(removeFileSafely).toHaveBeenCalledWith('/tmp/thumbnail.jpg', expect.anything())
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

  describe('Camera interruptions', () => {
    it('covers the preview while the session is interrupted and removes the cover when it ends', () => {
      const overlayTestId = testIdWithKey(TestIds.shared.cameraInterrupted.overlay)
      const navigation = useNavigation()
      const { getByTestId, queryByTestId } = render(
        <BasicAppContext initialStateOverride={storeWithPrompts}>
          <TakeVideoScreen navigation={navigation as never} />
        </BasicAppContext>
      )

      act(() => {
        getByTestId('mock-camera').props.onInterruptionStarted('unknown')
      })
      expect(getByTestId(overlayTestId)).toBeTruthy()

      act(() => {
        getByTestId('mock-camera').props.onInterruptionEnded()
      })
      expect(queryByTestId(overlayTestId)).toBeNull()
    })
  })

  describe('Leaving the app mid-recording and the 6 second minimum', () => {
    afterEach(() => {
      jest.restoreAllMocks()
    })

    const finishRecording = (getRecordingCallbacks: () => RecordingCallbacks) =>
      act(() => {
        getRecordingCallbacks().onRecordingFinished({
          filePath: '/tmp/recording.mov',
          reason: 'stopped',
          duration: 3,
          fileSize: 100,
        } as never)
      })

    it('keeps Done disabled until 6 seconds have been recorded', async () => {
      const navigation = useNavigation()
      const { screen, recorder } = await startRecordingScreen(navigation)

      await advanceSeconds(2)
      await act(async () => {
        fireEvent.press(nextPromptButton(screen))
      })
      // The last prompt has been shown for its 2 seconds, but only 4 seconds are recorded
      await advanceSeconds(2)
      expect(nextPromptButton(screen).props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }))

      await advanceSeconds(2)
      expect(nextPromptButton(screen).props.accessibilityState).toEqual(expect.objectContaining({ disabled: false }))
      await act(async () => {
        fireEvent.press(nextPromptButton(screen))
      })
      expect(recorder.stopRecordingVideo).toHaveBeenCalled()
    })

    it('discards a recording that ends before the user presses Done and asks them to record again', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert')
      const navigation = useNavigation()
      const { getRecordingCallbacks } = await startRecordingScreen(navigation)

      await advanceSeconds(3)
      await act(async () => {
        await finishRecording(getRecordingCallbacks)
      })

      expect(removeFileSafely).toHaveBeenCalledWith('/tmp/recording.mov', expect.anything())
      expect(removeFileSafely).toHaveBeenCalledWith('/tmp/thumbnail.jpg', expect.anything())
      expect(alertSpy).toHaveBeenCalledWith(
        'BCSC.SendVideo.TakeVideo.RecordingInterrupted',
        'BCSC.SendVideo.TakeVideo.RecordingInterruptedDescription'
      )
      expect(navigation.goBack).toHaveBeenCalled()
      expect(navigation.navigate).not.toHaveBeenCalledWith(BCSCScreens.VideoReview, expect.anything())
      expect(toMp4VideoPath).not.toHaveBeenCalled()
    })

    const setAppState = (appStateStatus: string, rerender: () => void) => {
      mockUseBCSCActivity.mockReturnValue({ appStateStatus })
      rerender()
    }

    it('throws the recording away and returns to the instructions once the app is active again', async () => {
      const navigation = useNavigation()
      const { screen, rerender, recorder } = await startRecordingScreen(navigation)
      await advanceSeconds(2)

      setAppState('background', rerender)
      await act(async () => {})

      expect(recorder.cancelRecordingVideo).toHaveBeenCalledTimes(1)
      expect(removeFileSafely).toHaveBeenCalledWith('/tmp/thumbnail.jpg', expect.anything())
      expect(screen.getByTestId('mock-camera').props.isActive).toBe(false)
      // Not yet: the instructions screen loads new prompts, which shouldn't run while the app is suspended
      expect(navigation.goBack).not.toHaveBeenCalled()

      setAppState('active', rerender)

      expect(navigation.goBack).toHaveBeenCalledTimes(1)
      expect(navigation.navigate).not.toHaveBeenCalledWith(BCSCScreens.VideoReview, expect.anything())
    })

    it('also throws the attempt away when the app goes inactive (e.g. Control Center on iOS)', async () => {
      const navigation = useNavigation()
      const { rerender, recorder } = await startRecordingScreen(navigation)

      setAppState('inactive', rerender)
      await act(async () => {})
      setAppState('active', rerender)

      expect(recorder.cancelRecordingVideo).toHaveBeenCalledTimes(1)
      expect(navigation.goBack).toHaveBeenCalledTimes(1)
    })

    it('does not start recording when the app leaves the foreground during the countdown', async () => {
      const navigation = useNavigation()
      const { rerender, recorder } = await startRecordingScreen(navigation, 1000)

      setAppState('background', rerender)
      await advanceSeconds(3)

      expect(recorder.takePhoto).not.toHaveBeenCalled()
      expect(recorder.startRecordingVideo).not.toHaveBeenCalled()

      setAppState('active', rerender)
      expect(navigation.goBack).toHaveBeenCalledTimes(1)
    })

    it('ignores the recording ending on its own after the attempt was thrown away', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert')
      const navigation = useNavigation()
      const { rerender, getRecordingCallbacks } = await startRecordingScreen(navigation)

      setAppState('background', rerender)
      await act(async () => {})
      // v5 ends the recording when the camera session stops, which can land after the cancel
      await act(async () => {
        await finishRecording(getRecordingCallbacks)
      })

      expect(alertSpy).not.toHaveBeenCalled()
      expect(navigation.goBack).not.toHaveBeenCalled()

      setAppState('active', rerender)
      expect(navigation.goBack).toHaveBeenCalledTimes(1)
    })

    it('stays on screen when the app is backgrounded before a recording attempt starts', async () => {
      mockUseBCSCActivity.mockReturnValue({ appStateStatus: 'background' })
      const navigation = useNavigation()
      const makeTree = () => (
        <BasicAppContext initialStateOverride={storeWithPrompts}>
          <TakeVideoScreen navigation={navigation as never} />
        </BasicAppContext>
      )
      const screen = render(makeTree())

      mockUseBCSCActivity.mockReturnValue({ appStateStatus: 'active' })
      screen.rerender(makeTree())

      expect(navigation.goBack).not.toHaveBeenCalled()
    })
  })
})
