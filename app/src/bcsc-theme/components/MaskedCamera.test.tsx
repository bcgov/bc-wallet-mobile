import { testIdWithKey } from '@bifold/core'
import { act, fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { Platform } from 'react-native'

import { AppEventCode } from '@/events/appEventCode'
import { TestIds } from '@/test-ids/registry'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import MaskedCamera from './MaskedCamera'

const mockTakePhoto = jest.fn().mockResolvedValue({ path: '/tmp/photo.jpg' })
const mockEmitErrorModal = jest.fn()
const mockEnsureAppError = jest.fn<{ name: string; message: string }, [unknown, AppEventCode]>(() => ({
  name: 'AppError',
  message: 'mocked error',
}))

jest.mock('@/errors/errorHandler', () => ({
  ensureAppError: (error: unknown, eventCode: AppEventCode) => mockEnsureAppError(error, eventCode),
}))

// useAlerts pulls in a heavy dependency chain (factory reset, stack context, etc.) unrelated
// to camera error handling — stub the one function MaskedCamera actually calls.
jest.mock('@/hooks/useAlerts', () => ({
  useAlerts: jest.fn(() => ({
    failedToWriteToLocalStorageAlert: jest.fn(),
  })),
}))

// Mock react-native-vision-camera — overrides the silent default mock from jestSetup.js so the
// Camera renders into the tree (with its onError prop reachable) and reports a real device.
jest.mock('react-native-vision-camera', () => {
  const React = jest.requireActual('react')
  const { View } = jest.requireActual('react-native')

  // Forward ref Camera component mock
  // eslint-disable-next-line react/display-name
  const MockCamera = React.forwardRef(({ children, ...props }: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      takePhoto: mockTakePhoto,
    }))

    return (
      <View testID="mock-camera" {...props}>
        {children}
      </View>
    )
  })

  return {
    Camera: MockCamera,
    useCameraDevice: jest.fn(() => ({
      id: 'back',
      hasTorch: true,
    })),
    useCameraFormat: jest.fn(() => ({
      maxFps: 30,
    })),
    CameraCaptureError: class CameraCaptureError extends Error {
      code: string
      constructor(code: string, message: string) {
        super(message)
        this.code = code
      }
    },
  }
})

// Mock BCSCActivityContext — not provided by BasicAppContext
const mockUseBCSCActivity = jest.fn(() => ({ appStateStatus: 'active' }))
jest.mock('../contexts/BCSCActivityContext', () => ({
  useBCSCActivity: () => mockUseBCSCActivity(),
}))

// Mock ErrorAlertContext for camera runtime error handling
jest.mock('@/contexts/ErrorAlertContext', () => {
  const actual = jest.requireActual('@/contexts/ErrorAlertContext')
  return {
    ...actual,
    useErrorAlert: jest.fn(() => ({
      emitErrorModal: mockEmitErrorModal,
    })),
  }
})

describe('MaskedCamera', () => {
  const mockOnPhotoTaken = jest.fn()
  const mockPhotoOutput = {} as any
  let mockNavigation: ReturnType<typeof useNavigation>

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseBCSCActivity.mockReturnValue({ appStateStatus: 'active' })
    mockNavigation = useNavigation()
  })

  const renderCamera = (photoOutput = mockPhotoOutput) => {
    return render(
      <BasicAppContext>
        <MaskedCamera
          navigation={mockNavigation as never}
          cameraFace="back"
          onPhotoTaken={mockOnPhotoTaken}
          photoOutput={photoOutput}
        />
      </BasicAppContext>
    )
  }

  describe('Camera runtime error handling', () => {
    it('shows an error modal when camera onError fires while the app is active', async () => {
      const { getByTestId } = renderCamera()

      const camera = getByTestId('mock-camera')
      const runtimeError = new Error('Runtime camera failure')
      const expectedAppError = {
        name: 'NormalizedAppError',
        message: 'normalized',
        addContext: jest.fn(),
        toJSON: jest.fn(),
      }
      mockEnsureAppError.mockReturnValueOnce(expectedAppError)

      await act(async () => {
        camera.props.onError(runtimeError)
      })

      expect(mockEnsureAppError).toHaveBeenCalledWith(runtimeError, AppEventCode.ADD_CARD_CAMERA_BROKEN)
      expect(expectedAppError.addContext).toHaveBeenCalled()
      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'BCSC.CameraDisclosure.Error',
        'BCSC.CameraDisclosure.ErrorMessage',
        expectedAppError
      )
    })

    it('ignores camera errors and does not show an error modal while the app is backgrounded', async () => {
      mockUseBCSCActivity.mockReturnValue({ appStateStatus: 'background' })

      const { getByTestId } = renderCamera()

      const camera = getByTestId('mock-camera')
      const runtimeError = new Error('Runtime camera failure while backgrounded')

      await act(async () => {
        camera.props.onError(runtimeError)
      })

      // Backgrounded camera errors are expected (the session is being torn down) and not
      // actionable — no error should be normalized or surfaced to the user.
      expect(mockEnsureAppError).not.toHaveBeenCalled()
      expect(mockEmitErrorModal).not.toHaveBeenCalled()
    })

    it('ignores camera errors and does not show an error modal while the app is inactive', async () => {
      mockUseBCSCActivity.mockReturnValue({ appStateStatus: 'inactive' })

      const { getByTestId } = renderCamera()

      const camera = getByTestId('mock-camera')
      const runtimeError = new Error('Runtime camera failure while inactive')

      await act(async () => {
        camera.props.onError(runtimeError)
      })

      // 'inactive' covers iOS transitional states (app switcher, notification shade,
      // incoming call) — errors there are equally expected and non-actionable as 'background'.
      expect(mockEnsureAppError).not.toHaveBeenCalled()
      expect(mockEmitErrorModal).not.toHaveBeenCalled()
    })

    it('still shows an error modal when appStateStatus is unknown', async () => {
      mockUseBCSCActivity.mockReturnValue({ appStateStatus: 'unknown' })

      const { getByTestId } = renderCamera()

      const camera = getByTestId('mock-camera')
      const runtimeError = new Error('Runtime camera failure with unknown app state')
      const expectedAppError = {
        name: 'NormalizedAppError',
        message: 'normalized',
        addContext: jest.fn(),
        toJSON: jest.fn(),
      }
      mockEnsureAppError.mockReturnValueOnce(expectedAppError)

      await act(async () => {
        camera.props.onError(runtimeError)
      })

      // 'unknown' is what AppState.currentState can report at Android startup — a genuine
      // camera failure there must still surface, so the guard must not be `!== 'active'`.
      expect(mockEnsureAppError).toHaveBeenCalledWith(runtimeError, AppEventCode.ADD_CARD_CAMERA_BROKEN)
      expect(expectedAppError.addContext).toHaveBeenCalled()
      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'BCSC.CameraDisclosure.Error',
        'BCSC.CameraDisclosure.ErrorMessage',
        expectedAppError
      )
    })
  })

  describe('Photo capture readiness', () => {
    const shutterTestId = testIdWithKey(TestIds.shared.maskedCamera.takePhoto)
    const overlayTestId = testIdWithKey(TestIds.shared.cameraInterrupted.overlay)
    const notReadyTestId = testIdWithKey(TestIds.shared.maskedCamera.notReady)

    const makeAppError = () => ({
      name: 'NormalizedAppError',
      message: 'normalized',
      addContext: jest.fn(),
      toJSON: jest.fn(),
    })

    const renderStartedCamera = async (photoOutput = mockPhotoOutput) => {
      const utils = renderCamera(photoOutput)
      await act(async () => {
        utils.getByTestId('mock-camera').props.onStarted()
      })
      return utils
    }

    it('disables the shutter until the camera session has started', async () => {
      const { getByTestId } = renderCamera()
      expect(getByTestId(shutterTestId).props.accessibilityState).toEqual({ disabled: true })

      await act(async () => {
        getByTestId('mock-camera').props.onStarted()
      })
      expect(getByTestId(shutterTestId).props.accessibilityState).toEqual({ disabled: false })
    })

    it('covers the preview and disables the shutter while the session is interrupted', async () => {
      const { getByTestId, queryByTestId } = await renderStartedCamera()
      const camera = getByTestId('mock-camera')

      await act(async () => {
        camera.props.onInterruptionStarted('unknown')
      })
      expect(getByTestId(overlayTestId)).toBeTruthy()
      expect(getByTestId(shutterTestId).props.accessibilityState).toEqual({ disabled: true })
      expect(mockEmitErrorModal).not.toHaveBeenCalled()

      await act(async () => {
        camera.props.onInterruptionEnded()
      })
      expect(queryByTestId(overlayTestId)).toBeNull()
      expect(getByTestId(shutterTestId).props.accessibilityState).toEqual({ disabled: false })
    })

    it.each([
      ['iOS session not running', 'Error Domain=AVFoundationErrorDomain Code=-11803 "Cannot Record" UserInfo={}'],
      ['Android camera closed', 'androidx.camera.core.ImageCaptureException: Camera is closed.'],
    ])('asks the user to try again instead of reporting a broken camera (%s)', async (_, message) => {
      const photoOutput = { capturePhotoToFile: jest.fn().mockRejectedValue(new Error(message)) } as any
      const { getByTestId } = await renderStartedCamera(photoOutput)

      await act(async () => {
        fireEvent.press(getByTestId(shutterTestId))
      })

      expect(photoOutput.capturePhotoToFile).toHaveBeenCalled()
      expect(getByTestId(notReadyTestId)).toBeTruthy()
      expect(mockEmitErrorModal).not.toHaveBeenCalled()
      expect(mockOnPhotoTaken).not.toHaveBeenCalled()
    })

    it('clears the not-ready notice once the camera starts again', async () => {
      const photoOutput = {
        capturePhotoToFile: jest.fn().mockRejectedValue(new Error('Camera is closed.')),
      } as any
      const { getByTestId, queryByTestId } = await renderStartedCamera(photoOutput)

      await act(async () => {
        fireEvent.press(getByTestId(shutterTestId))
      })
      expect(getByTestId(notReadyTestId)).toBeTruthy()

      await act(async () => {
        getByTestId('mock-camera').props.onStarted()
      })
      expect(queryByTestId(notReadyTestId)).toBeNull()
    })

    it('still reports other capture failures as a camera error', async () => {
      const captureError = new Error(
        'Error Domain=AVFoundationErrorDomain Code=-11800 "The operation could not be completed"'
      )
      const photoOutput = { capturePhotoToFile: jest.fn().mockRejectedValue(captureError) } as any
      mockEnsureAppError.mockImplementation(makeAppError)
      const { getByTestId, queryByTestId } = await renderStartedCamera(photoOutput)

      await act(async () => {
        fireEvent.press(getByTestId(shutterTestId))
      })

      expect(queryByTestId(notReadyTestId)).toBeNull()
      expect(mockEnsureAppError).toHaveBeenCalledWith(captureError, AppEventCode.ADD_CARD_CAMERA_BROKEN)
      expect(mockEmitErrorModal).toHaveBeenCalledTimes(1)
    })

    it('reports a second "not ready" capture failure in a row with the camera error modal', async () => {
      const notReadyError = new Error('Error Domain=AVFoundationErrorDomain Code=-11803 "Cannot Record" UserInfo={}')
      const photoOutput = { capturePhotoToFile: jest.fn().mockRejectedValue(notReadyError) } as any
      mockEnsureAppError.mockImplementation(makeAppError)
      const { getByTestId, queryByTestId } = await renderStartedCamera(photoOutput)

      await act(async () => {
        fireEvent.press(getByTestId(shutterTestId))
      })
      expect(mockEmitErrorModal).not.toHaveBeenCalled()

      await act(async () => {
        fireEvent.press(getByTestId(shutterTestId))
      })
      expect(mockEnsureAppError).toHaveBeenCalledWith(notReadyError, AppEventCode.ADD_CARD_CAMERA_BROKEN)
      expect(mockEmitErrorModal).toHaveBeenCalledTimes(1)
      expect(queryByTestId(notReadyTestId)).toBeNull()

      // The count starts over after the report, so the next failure is a notice again
      await act(async () => {
        fireEvent.press(getByTestId(shutterTestId))
      })
      expect(getByTestId(notReadyTestId)).toBeTruthy()
      expect(mockEmitErrorModal).toHaveBeenCalledTimes(1)
    })

    describe('camera that stays unusable for 8 seconds', () => {
      beforeEach(() => {
        jest.useFakeTimers()
        mockEnsureAppError.mockImplementation(makeAppError)
      })

      afterEach(() => {
        jest.useRealTimers()
      })

      it('reports a camera that never starts with the camera error modal', async () => {
        renderCamera()

        await act(async () => {
          jest.advanceTimersByTime(7999)
        })
        expect(mockEmitErrorModal).not.toHaveBeenCalled()

        await act(async () => {
          jest.advanceTimersByTime(1)
        })
        expect(mockEnsureAppError).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'Camera did not start within 8 s' }),
          AppEventCode.ADD_CARD_CAMERA_BROKEN
        )
        expect(mockEmitErrorModal).toHaveBeenCalledWith(
          'BCSC.CameraDisclosure.Error',
          'BCSC.CameraDisclosure.ErrorMessage',
          expect.anything()
        )
      })

      it('reports an interruption that lasts 8 seconds, and keeps the overlay up', async () => {
        const { getByTestId } = renderCamera()
        await act(async () => {
          getByTestId('mock-camera').props.onStarted()
          getByTestId('mock-camera').props.onInterruptionStarted('video-device-in-use-by-another-client')
        })

        await act(async () => {
          jest.advanceTimersByTime(8000)
        })

        expect(mockEnsureAppError).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'Camera interrupted for 8 s (video-device-in-use-by-another-client)' }),
          AppEventCode.ADD_CARD_CAMERA_BROKEN
        )
        expect(mockEmitErrorModal).toHaveBeenCalledTimes(1)
        expect(getByTestId(overlayTestId)).toBeTruthy()
      })

      it('does not report a camera that starts in time', async () => {
        const { getByTestId } = renderCamera()

        await act(async () => {
          jest.advanceTimersByTime(2000)
          getByTestId('mock-camera').props.onStarted()
        })
        await act(async () => {
          jest.advanceTimersByTime(20000)
        })

        expect(mockEmitErrorModal).not.toHaveBeenCalled()
      })

      it('does not time out while the app is in the background', async () => {
        mockUseBCSCActivity.mockReturnValue({ appStateStatus: 'background' })
        renderCamera()

        await act(async () => {
          jest.advanceTimersByTime(20000)
        })

        expect(mockEmitErrorModal).not.toHaveBeenCalled()
      })
    })

    describe('iOS media services reset', () => {
      const originalPlatform = Platform.OS
      const resetError = () =>
        new Error('Error Domain=AVFoundationErrorDomain Code=-11819 "Cannot Complete Action" UserInfo={}')

      beforeEach(() => {
        Platform.OS = 'ios'
        mockEnsureAppError.mockImplementation(makeAppError)
      })

      afterEach(() => {
        Platform.OS = originalPlatform
      })

      it('waits for the session to restart after a single reset', async () => {
        const { getByTestId } = renderCamera()

        await act(async () => {
          getByTestId('mock-camera').props.onError(resetError())
        })

        expect(mockEmitErrorModal).not.toHaveBeenCalled()
      })

      it('reports a second reset inside the recovery window (restart failed)', async () => {
        const { getByTestId } = renderCamera()
        const camera = getByTestId('mock-camera')

        await act(async () => {
          camera.props.onError(resetError())
        })
        await act(async () => {
          camera.props.onError(resetError())
        })

        expect(mockEmitErrorModal).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Mirroring (regression for #4020)', () => {
    it('saves the photo un-mirrored while leaving the preview to the default', () => {
      const { getByTestId } = renderCamera()
      const mirrorMode = getByTestId('mock-camera').props.mirrorMode

      expect(mirrorMode(mockPhotoOutput)).toBe('off')
      // Any other output is <Camera>'s internal preview, which keeps 'auto' (mirrored on the front camera)
      expect(mirrorMode({})).toBe('auto')
    })
  })

  describe('Background / foreground camera lifecycle (regression for #4256)', () => {
    it('deactivates the camera when the app goes to the background', () => {
      mockUseBCSCActivity.mockReturnValue({ appStateStatus: 'background' })

      const { getByTestId } = renderCamera()

      expect(getByTestId('mock-camera').props.isActive).toBe(false)
    })

    it('activates the camera when the app is in the foreground', () => {
      mockUseBCSCActivity.mockReturnValue({ appStateStatus: 'active' })

      const { getByTestId } = renderCamera()

      expect(getByTestId('mock-camera').props.isActive).toBe(true)
    })

    it('stays active when appStateStatus is an unexpected value like unknown (fail-safe default)', () => {
      mockUseBCSCActivity.mockReturnValue({ appStateStatus: 'unknown' })

      const { getByTestId } = renderCamera()

      // The gate deactivates on KNOWN background states rather than activating only on a
      // known-active one, so an unexpected value can't strand the camera off permanently.
      expect(getByTestId('mock-camera').props.isActive).toBe(true)
    })
  })
})
