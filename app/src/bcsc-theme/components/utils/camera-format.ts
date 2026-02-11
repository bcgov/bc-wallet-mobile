import { PHOTO_RESOLUTION_720P } from '@/constants'
import { FormatFilter } from 'react-native-vision-camera'

/**
 * Optimized camera format configurations for various use cases
 */
export const CameraFormat = {
  /**
   * Format optimized for masked camera with barcode detection
   * Higher FPS and resolution for better barcode recognition
   */
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

  /**
   * Format optimized for scanning small barcodes (code-39, code-128, PDF417)
   * Prioritizes high resolution and frame rate for accurate detection of small codes
   *
   * Barcode sizes:
   * - Code-39/Code-128: ~30mm x 4mm
   * - PDF417: ~50mm x 9mm
   */
  SmallBarcodeScanning: [
    // High FPS for better real-time detection
    {
      fps: 60,
    },
    // High resolution for detecting small barcode details
    {
      photoResolution: { width: 1920, height: 1080 },
    },
    // Maximum video resolution for better preview quality
    {
      videoResolution: 'max',
    },
    // Enable video stabilization for steadier scanning
    {
      videoStabilizationMode: 'auto',
    },
  ] satisfies FormatFilter[],
}
