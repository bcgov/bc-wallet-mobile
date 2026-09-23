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

// Optimized for small file size
export const useSelfieVideoOutput = () => {
  return useVideoOutput({
    fileType: 'mp4',
    targetResolution: CommonResolutions.VGA_16_9, // 480p
  })
}
