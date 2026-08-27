import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { ensureAppError } from '@/errors/errorHandler'
import { AppEventCode } from '@/events/appEventCode'
import { TOKENS, useServices } from '@bifold/core'
import { useIsFocused } from '@react-navigation/native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CameraRef,
  CommonResolutions,
  QualityPrioritization,
  Recorder,
  Size,
  TargetCameraPosition,
  useCameraDevice,
  usePhotoOutput,
  useVideoOutput,
} from 'react-native-vision-camera'
import { getCameraMetadata } from '../components/utils/camera'

interface VisionCameraOptions {
  position?: TargetCameraPosition
  quality?: number
  qualityPrioritization?: QualityPrioritization
  targetResolution?: Size
}

const DEFAULT_OPTIONS: Required<VisionCameraOptions> = {
  position: 'back',
  quality: 0.9,
  qualityPrioritization: 'quality',
  targetResolution: CommonResolutions.FHD_16_9, // 1080p
}

export const useVisionCamera = (visionCameraOptions: VisionCameraOptions) => {
  const options = { ...DEFAULT_OPTIONS, ...visionCameraOptions }

  // Utility Hooks
  const { t } = useTranslation()
  const { emitErrorModal } = useErrorAlert()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const isFocused = useIsFocused()

  // Vision Camera Hooks
  const cameraRef = useRef<CameraRef>(null)
  const device = useCameraDevice(options.position)
  const photoOutput = usePhotoOutput({
    quality: options.quality,
    qualityPrioritization: options.qualityPrioritization,
    targetResolution: options.targetResolution,
  })
  const videoOutput = useVideoOutput({
    targetResolution: options.targetResolution,
    enableAudio: true,
  })
  const [isTorchOn, setIsTorchOn] = useState(cameraRef.current?.controller?.torchMode === 'on')
  const recorderRef = useRef<Recorder>(null)

  const hasTorch = device?.hasTorch ?? false

  const emitCameraError = useCallback(
    (error: unknown) => {
      const appError = ensureAppError(error, AppEventCode.CAMERA_ERROR)

      appError.addContext(getCameraMetadata(device))

      emitErrorModal(t('BCSC.CameraDisclosure.Error'), t('BCSC.CameraDisclosure.ErrorMessage'), appError)
      return appError
    },
    [device, emitErrorModal, t]
  )

  const takeAndSavePhoto = useCallback(async () => {
    try {
      const photo = await photoOutput.capturePhotoToFile({ flashMode: 'off', enableShutterSound: false }, {})
      return photo
    } catch (error) {
      logger.error('[Camera] Error capturing photo to file', error as Error)
      throw emitCameraError(error)
    }
  }, [emitCameraError, logger, photoOutput])

  const startRecordingVideo = useCallback(async () => {
    try {
      if (recorderRef.current?.isRecording) {
        logger.warn('[Camera] Recording already in progress')
        return
      }

      recorderRef.current = await videoOutput.createRecorder({})

      await recorderRef.current.startRecording(
        () => {},
        () => {}
      )
    } catch (error) {
      logger.error('[Camera] Error starting video recording', error as Error)
      throw emitCameraError(error)
    }
  }, [emitCameraError, logger, videoOutput])

  const stopRecordingVideo = useCallback(async () => {
    try {
      if (!recorderRef.current?.isRecording) {
        logger.warn('[Camera] No recording in progress')
        return
      }

      await recorderRef.current.stopRecording()
    } catch (error) {
      logger.error('[Camera] Error stopping video recording', error as Error)
      throw emitCameraError(error)
    } finally {
      recorderRef.current = null
    }
  }, [emitCameraError, logger])

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
      takeAndSavePhoto,
      startRecordingVideo,
      stopRecordingVideo,
      hasTorch,
      isTorchOn,
      enableTorch,
      emitCameraError,
      photoOutput,
      videoOutput,
    }),
    [
      device,
      emitCameraError,
      enableTorch,
      hasTorch,
      isTorchOn,
      photoOutput,
      startRecordingVideo,
      stopRecordingVideo,
      takeAndSavePhoto,
      videoOutput,
    ]
  )
}
