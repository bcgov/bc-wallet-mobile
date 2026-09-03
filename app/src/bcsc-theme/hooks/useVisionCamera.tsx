import { TOKENS, useServices } from '@bifold/core'
import { useFocusEffect } from '@react-navigation/native'
import { RefObject, useCallback, useMemo, useRef, useState } from 'react'
import {
  CameraOutput,
  CameraPhotoOutput,
  CameraRef,
  CameraVideoOutput,
  DeviceFilter,
  Recorder,
  RecordingFinishedReason,
  TargetCameraPosition,
  useCameraDevice,
} from 'react-native-vision-camera'

const DEFAULT_VIDEO_OUTPUT_CODEC = 'h264'

interface StartRecordingCallbacks {
  onRecordingFinished: (recording: {
    filePath: string
    reason: RecordingFinishedReason
    duration: number
    fileSize: number
  }) => void
  onRecordingError: (error: Error) => void
}

interface VisionCameraOptions {
  position: TargetCameraPosition
  deviceFilter?: DeviceFilter
  photoOutput?: CameraPhotoOutput
  videoOutput?: CameraVideoOutput
  scannerOutput?: CameraOutput
}

/**
 * A custom hook that provides a convenient interface for using the Vision Camera.
 * It manages camera device selection, photo capture, and video recording.
 * @returns An object containing the camera reference, selected device, and functions for taking photos and recording videos.
 */
export const useVisionCamera = ({ position, deviceFilter, photoOutput, videoOutput }: VisionCameraOptions) => {
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const device = useCameraDevice(position, deviceFilter)
  const cameraRef = useRef<CameraRef>(null)
  const recorderRef = useRef<Recorder>(null)

  /**
   * THOUGHT: Should this component be responsible for requesting permissions?
   * Or should that be handled by the parent component?
   */

  /**
   * Captures a photo using the configured `CameraPhotoOutput`.
   * @throws If no `CameraPhotoOutput` is configured or if an error occurs during photo capture.
   * @returns A Promise that resolves with the file path of the captured photo.
   */
  const takePhoto = useCallback(async () => {
    if (!photoOutput) {
      throw new Error('[Camera] No photo output configured. Please provide a CameraPhotoOutput to take photos.')
    }

    logger.debug('[Camera] Capturing photo to file')

    return photoOutput.capturePhotoToFile({ flashMode: 'off', enableShutterSound: false }, {})
  }, [logger, photoOutput])

  /**
   * Starts recording a video using the configured `CameraVideoOutput`.
   * @throws If no `CameraVideoOutput` is configured or if an error occurs during recording.
   * @returns A Promise that resolves when the recording has started.
   *  `onRecordingFinished` callback will be invoked when the recording is finished.
   *  `onRecordingError` callback will be invoked if an error occurs during recording.
   */
  const startRecordingVideo = useCallback(
    async (options: StartRecordingCallbacks) => {
      if (!videoOutput) {
        throw new Error('[Camera] No video output configured. Please provide a CameraVideoOutput to start recording.')
      }

      if (recorderRef.current?.isRecording) {
        logger.warn('[Camera] Recording already in progress')
        return
      }

      logger.debug('[Camera] Starting video recording')

      // Note: Video output settings must be set before creating the recorder
      videoOutput.setOutputSettings({ codec: DEFAULT_VIDEO_OUTPUT_CODEC })
      recorderRef.current = await videoOutput.createRecorder({})

      await recorderRef.current.startRecording(
        (filePath, reason) =>
          options.onRecordingFinished({
            filePath,
            reason,
            duration: recorderRef.current?.recordedDuration ?? -1,
            fileSize: recorderRef.current?.recordedFileSize ?? -1,
          }),
        options.onRecordingError
      )
    },
    [logger, videoOutput]
  )

  /**
   * Stops the current video recording.
   * @returns A Promise that resolves when the recording has been stopped.
   */
  const stopRecordingVideo = useCallback(async () => {
    try {
      if (!recorderRef.current?.isRecording) {
        logger.warn('[Camera] No recording in progress')
        return
      }

      logger.debug('[Camera] Stopping video recording')

      await recorderRef.current.stopRecording()
    } finally {
      recorderRef.current = null
    }
  }, [logger])

  /**
   * Cancels the current video recording and discards the recorded file.
   * @returns A Promise that resolves when the recording has been canceled.
   */
  const cancelRecordingVideo = useCallback(async () => {
    if (!recorderRef.current?.isRecording) {
      logger.warn('[Camera] No recording in progress to cancel')
      return
    }

    logger.debug('[Camera] Canceling video recording')

    await recorderRef.current.cancelRecording()
  }, [logger])

  return useMemo(
    () => ({
      cameraRef,
      device,
      takePhoto,
      startRecordingVideo,
      stopRecordingVideo,
      cancelRecordingVideo,
      cameraOutputs: [photoOutput, videoOutput].filter(Boolean) as CameraOutput[],
    }),
    [cancelRecordingVideo, device, photoOutput, startRecordingVideo, stopRecordingVideo, takePhoto, videoOutput]
  )
}

/**
 * A custom hook that provides controls for the Vision Camera, including torch (flashlight) functionality.
 * @returns An object containing the torch state, availability, and a function to enable or disable the torch.
 */
export const useVisionCameraControls = (cameraRef: RefObject<CameraRef | null>) => {
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const controller = cameraRef.current?.controller

  const [torchEnabled, setTorchEnabled] = useState(controller?.torchMode === 'on')
  const hasTorch = controller?.device.hasTorch ?? false

  /**
   * Enables or disables the torch (flashlight) mode of the camera.
   * @param enable A boolean indicating whether to enable (true) or disable (false) the torch mode.
   * @returns A Promise that resolves when the torch mode has been set.
   */
  const enableTorch = useCallback(
    (enable: boolean) => {
      if (!controller) {
        logger.warn('[Camera] No camera controller available to set torch mode')
        return
      }

      controller.setTorchMode(enable ? 'on' : 'off')
      setTorchEnabled(enable)
    },
    [controller, logger]
  )

  useFocusEffect(
    useCallback(() => {
      setTorchEnabled(false)
    }, [])
  )

  return useMemo(
    () => ({
      hasTorch,
      isTorchEnabled: torchEnabled,
      enableTorch,
    }),
    [enableTorch, hasTorch, torchEnabled]
  )
}
