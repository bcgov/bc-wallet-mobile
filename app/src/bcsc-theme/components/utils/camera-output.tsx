import { CommonResolutions, VisionCamera } from 'react-native-vision-camera'

export const EvidencePhotoOutput = VisionCamera.createPhotoOutput({
  quality: 0.9,
  qualityPrioritization: 'speed',
  targetResolution: CommonResolutions.FHD_16_9, // 1080p
  containerFormat: 'jpeg',
})

export const SelfiePhotoOutput = VisionCamera.createPhotoOutput({
  quality: 0.9,
  qualityPrioritization: 'quality',
  targetResolution: CommonResolutions.FHD_16_9, // 1080p
  containerFormat: 'jpeg',
})

export const SelfieVideoOutput = VisionCamera.createVideoOutput({
  fileType: 'mp4',
  targetResolution: CommonResolutions.VGA_16_9, // 480p
})
