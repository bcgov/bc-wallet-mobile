import { Platform } from 'react-native'
import {
  CommonResolutions,
  PreviewImplementationMode,
  QualityPrioritization,
  usePhotoOutput,
  useVideoOutput,
} from 'react-native-vision-camera'

/**
 * Android preview: a TextureView ('compatible'), as ias-android used, rather than v5's default
 * SurfaceView ('performance'), which misbehaves on some low-end phones. Ignored on iOS.
 */
export const PREVIEW_IMPLEMENTATION_MODE: PreviewImplementationMode = 'compatible'

/*
 * On Android, photos use 'balanced' (CameraX's MINIMIZE_LATENCY capture mode), as v4 and ias-android did.
 * v5 maps 'speed' to the experimental zero-shutter-lag mode and 'quality' to MAXIMIZE_QUALITY, whose extra
 * pre-capture steps are where weak camera drivers (e.g. Unisoc phones such as the Nokia C31) fail.
 * iOS keeps its own setting, which v5 maps the same way as v4.
 */

// Optimized for speed and moderate file size
export const useEvidencePhotoOutput = () => {
  return usePhotoOutput({
    quality: 0.9,
    qualityPrioritization: Platform.select<QualityPrioritization>({ android: 'balanced', default: 'speed' }),
    targetResolution: CommonResolutions.FHD_16_9, // 1080p
    containerFormat: 'jpeg',
  })
}

// Optimized for quality and moderate file size
export const useSelfiePhotoOutput = () => {
  return usePhotoOutput({
    quality: 0.9,
    qualityPrioritization: Platform.select<QualityPrioritization>({ android: 'balanced', default: 'quality' }),
    targetResolution: CommonResolutions.FHD_16_9, // 1080p
    containerFormat: 'jpeg',
  })
}

// Without a target, v5 records ~6.5 Mbps (v4 was ~3-4 Mbps), which slows reading and uploading the video.
const SELFIE_VIDEO_BIT_RATE = 2_000_000 // 2 Mbps

// Optimized for small file size
export const useSelfieVideoOutput = () => {
  return useVideoOutput({
    fileType: 'mp4',
    targetResolution: CommonResolutions.VGA_16_9, // 480p
    targetBitRate: SELFIE_VIDEO_BIT_RATE,
    enableAudio: true,
  })
}
