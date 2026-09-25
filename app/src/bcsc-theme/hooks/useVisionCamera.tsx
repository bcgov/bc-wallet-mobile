import { TOKENS, useServices } from '@bifold/core'
import { useCallback, useMemo, useRef } from 'react'
import { activateAudioSessionForRecording } from 'react-native-bcsc-core'
import {
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

      // Another component (e.g. the review screen's video player) may have deactivated the audio session,
      // which leaves the microphone silent on iOS. Recording still goes ahead if this fails.
      try {
        await activateAudioSessionForRecording()
      } catch (error) {
        logger.warn('[Camera] Failed to activate the audio session for recording', { error: String(error) })
      }

      // Note: Video output settings must be set before creating the recorder
      videoOutput.setOutputSettings({ codec: DEFAULT_VIDEO_OUTPUT_CODEC })
      recorderRef.current = await videoOutput.createRecorder({})

      await recorderRef.current.startRecording((filePath, reason) => {
        options.onRecordingFinished({
          filePath,
          reason,
          duration: recorderRef.current?.recordedDuration ?? -1,
          fileSize: recorderRef.current?.recordedFileSize ?? -1,
        })

        // Reset the recorder reference after recording is finished
        recorderRef.current = null
      }, options.onRecordingError)
    },
    [logger, videoOutput]
  )

  /**
   * Stops the current video recording.
   * @returns A Promise that resolves when the recording has been stopped.
   */
  const stopRecordingVideo = useCallback(async () => {
    if (!recorderRef.current?.isRecording) {
      logger.warn('[Camera] No recording in progress')
      return
    }

    logger.debug('[Camera] Stopping video recording')

    await recorderRef.current.stopRecording()
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
    }),
    [cancelRecordingVideo, device, startRecordingVideo, stopRecordingVideo, takePhoto]
  )
}

/**
 * CameraX cancels a camera-control call (torch, zoom) when a newer call supersedes it or the
 * camera isn't active yet; VisionCamera v5.2.3 reports that through `onError`. Not a dead camera.
 * TODO (MD): Deprecate this once VisionCamera stops surfacing these on Android
 * @see https://github.com/margelo/react-native-vision-camera/issues/3907#issuecomment-5264861310
 * @see https://github.com/margelo/react-native-vision-camera/issues/4069
 */
export const isCameraControlCanceledError = (error: unknown): error is Error => {
  const CAMERAX_OPERATION_CANCELED = 'androidx.camera.core.CameraControl$OperationCanceledException'

  return error instanceof Error && error.message.includes(CAMERAX_OPERATION_CANCELED)
}
