import { act, render } from '@testing-library/react-native'
import React from 'react'

import { AppEventCode } from '@/events/appEventCode'
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
  let mockNavigation: ReturnType<typeof useNavigation>

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseBCSCActivity.mockReturnValue({ appStateStatus: 'active' })
    mockNavigation = useNavigation()
  })

  const renderCamera = () => {
    return render(
      <BasicAppContext>
        <MaskedCamera navigation={mockNavigation as never} cameraFace="back" onPhotoTaken={mockOnPhotoTaken} />
      </BasicAppContext>
    )
  }

  describe('Camera runtime error handling', () => {
    it('shows an error modal when camera onError fires while the app is active', async () => {
      const { getByTestId } = renderCamera()

      const camera = getByTestId('mock-camera')
      const runtimeError = new Error('Runtime camera failure')
      const expectedAppError = { name: 'NormalizedAppError', message: 'normalized', addContext: jest.fn() }
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
      const expectedAppError = { name: 'NormalizedAppError', message: 'normalized', addContext: jest.fn() }
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
