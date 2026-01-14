import { PHOTO_RESOLUTION_720P } from '@/constants'
import { FormatFilter } from 'react-native-vision-camera'

export const CameraFormat = {
  MaskedWithBarcodeDetection: [
    // Target 60 FPS for smoother camera preview and better barcode detection
    {
      fps: 60,
    },
    // Select the highest possible video resolution (for preview quality)
    {
      videoResolution: 'max',
    },
    // Limit photo resolution to 720p for faster processing and lower file sizes
    {
      photoResolution: PHOTO_RESOLUTION_720P,
    },
  ] satisfies FormatFilter[],
}
