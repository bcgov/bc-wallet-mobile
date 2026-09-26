import { CommonResolutions, usePhotoOutput, useVideoOutput } from 'react-native-vision-camera'

// Optimized for speed and moderate file size
export const useEvidencePhotoOutput = () => {
  return usePhotoOutput({
    quality: 0.9,
    qualityPrioritization: 'speed',
    targetResolution: CommonResolutions.FHD_16_9, // 1080p
    containerFormat: 'jpeg',
  })
}

// Optimized for quality and moderate file size
export const useSelfiePhotoOutput = () => {
  return usePhotoOutput({
    quality: 0.9,
    qualityPrioritization: 'quality',
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
