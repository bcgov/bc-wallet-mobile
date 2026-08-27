import { TOKENS, useServices } from '@bifold/core'
import { useIsFocused } from '@react-navigation/native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CameraRef,
  CommonResolutions,
  QualityPrioritization,
  Recorder,
  RecordingFinishedReason,
  Size,
  TargetCameraPosition,
  useCameraDevice,
  usePhotoOutput,
  useVideoOutput,
} from 'react-native-vision-camera'

// NOTE: Pull any of these values into VisionCameraOptions if external customization needed
const DEFAULT_QUALITY_COMPRESSION = 0.9
const DEFAULT_VIDEO_FILE_TYPE = 'mp4'
const DEFAULT_VIDEO_CODEC = 'h264'

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
  position?: TargetCameraPosition
  qualityPrioritization?: QualityPrioritization
  targetVideoResolution?: Size
  targetPhotoResolution?: Size
}

const DEFAULT_OPTIONS: Required<VisionCameraOptions> = {
  position: 'back',
  qualityPrioritization: 'quality',
  targetPhotoResolution: CommonResolutions.FHD_16_9, // 1080p
  targetVideoResolution: CommonResolutions.VGA_16_9, // 480p
}

export const useVisionCamera = (visionCameraOptions: VisionCameraOptions) => {
  const options = { ...DEFAULT_OPTIONS, ...visionCameraOptions }

  // Utility Hooks
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const isFocused = useIsFocused()

  // Vision Camera Hooks
  const cameraRef = useRef<CameraRef>(null)
  const device = useCameraDevice(options.position)
  const photoOutput = usePhotoOutput({
    quality: DEFAULT_QUALITY_COMPRESSION,
    qualityPrioritization: options.qualityPrioritization,
    targetResolution: options.targetPhotoResolution,
  })
  const videoOutput = useVideoOutput({
    targetResolution: options.targetVideoResolution,
    enableAudio: true,
    fileType: DEFAULT_VIDEO_FILE_TYPE,
  })
  const [isTorchOn, setIsTorchOn] = useState(cameraRef.current?.controller?.torchMode === 'on')
  const recorderRef = useRef<Recorder>(null)

  const hasTorch = device?.hasTorch ?? false

  const takePhoto = useCallback(async () => {
    logger.debug('[Camera] Capturing photo to file')
    return photoOutput.capturePhotoToFile({ flashMode: 'off', enableShutterSound: false }, {})
  }, [logger, photoOutput])

  const startRecordingVideo = useCallback(
    async (options: StartRecordingCallbacks) => {
      if (recorderRef.current?.isRecording) {
        logger.warn('[Camera] Recording already in progress')
        return
      }

      logger.debug('[Camera] Starting video recording')

      // Note: Video output settings must be set before creating the recorder
      videoOutput.setOutputSettings({ codec: DEFAULT_VIDEO_CODEC })
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

  const cancelRecordingVideo = useCallback(async () => {
    if (!recorderRef.current?.isRecording) {
      logger.warn('[Camera] No recording in progress to cancel')
      return
    }

    await recorderRef.current.cancelRecording()
  }, [logger])

  const enableTorch = useCallback((enabled: boolean) => {
    setIsTorchOn(enabled)
    cameraRef.current?.controller?.setTorchMode(enabled ? 'on' : 'off')
  }, [])

  useEffect(() => {
    if (!isFocused) {
      enableTorch(false)
    }
  }, [enableTorch, isFocused])

  return useMemo(
    () => ({
      cameraRef,
      device,
      takePhoto,
      startRecordingVideo,
      stopRecordingVideo,
      cancelRecordingVideo,
      hasTorch,
      isTorchOn,
      enableTorch,
      photoOutput,
      videoOutput,
    }),
    [
      cancelRecordingVideo,
      device,
      enableTorch,
      hasTorch,
      isTorchOn,
      photoOutput,
      startRecordingVideo,
      stopRecordingVideo,
      takePhoto,
      videoOutput,
    ]
  )
}
