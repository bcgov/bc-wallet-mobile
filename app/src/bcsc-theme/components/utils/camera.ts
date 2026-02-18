import { Platform } from 'react-native'
import { Code, FormatFilter } from 'react-native-vision-camera'

import { PHOTO_RESOLUTION_720P } from '@/constants'

// ─── Shared Types ─────────────────────────────────────────────────────────────

/** Axis-aligned bounding rectangle */
export type Rect = { x: number; y: number; width: number; height: number }

/**
 * Extended Code interface with position and orientation metadata
 */
export interface EnhancedCode extends Code {
  /** Position of the barcode in the camera frame */
  position?: Rect
  /** Orientation of the barcode (horizontal or vertical) */
  orientation?: 'horizontal' | 'vertical'
  /** Whether the code is aligned with the scan zone */
  isAligned?: boolean
  /** Whether the code has been validated through consecutive readings */
  isValidated?: boolean
  /** Number of consecutive identical readings for this code */
  readingCount?: number
}

/**
 * A saved scan zone describing where a barcode is expected on a card.
 * Coordinates are normalized (0–1) relative to the camera container.
 */
export interface ScanZone {
  /** Barcode format types expected in this zone (e.g. ['code-39'], ['pdf-417']) */
  types: string[]
  /** Normalized bounding box (0–1) relative to the camera container */
  box: Rect
}

/** Collective scan state: scanning → aligned → locked */
export type ScanState = 'scanning' | 'aligned' | 'locked'

// ─── Camera Format Configurations ─────────────────────────────────────────────

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

// ─── Pure Utility Functions ───────────────────────────────────────────────────

/**
 * Calculate barcode orientation from its corner points.
 *
 * @param corners Corner points of the detected barcode
 * @returns 'horizontal' if wider than tall, 'vertical' otherwise
 */
export const calculateBarcodeOrientation = (corners?: { x: number; y: number }[]): 'horizontal' | 'vertical' => {
  if (!corners || corners.length < 2) {
    return 'horizontal'
  }
  const width = Math.abs(corners[1].x - corners[0].x)
  const height = Math.abs(corners[2].y - corners[0].y)
  return width > height ? 'horizontal' : 'vertical'
}

/**
 * Clamp a zoom level to the device's supported min/max range.
 *
 * @param target Requested zoom level
 * @param min Device minimum zoom (e.g. device.minZoom ?? 1)
 * @param max Device maximum zoom (e.g. device.maxZoom ?? 10)
 * @returns Clamped zoom value within [min, max]
 */
export const clampZoom = (target: number, min: number, max: number): number => Math.max(min, Math.min(target, max))

/**
 * Expand a highlight bounding box on Android to include the quiet zones that
 * ML Kit's `boundingBox` omits. On other platforms the position is returned as-is.
 *
 * @param position Transformed barcode position in container coordinates
 * @param pad Padding in pixels to add on each side (default 8)
 * @returns Padded position on Android, original position on other platforms
 */
export const getPaddedHighlightPosition = (position: Rect, pad: number = 8): Rect => {
  if (Platform.OS !== 'android') {
    return position
  }
  return {
    x: position.x - pad,
    y: position.y - pad,
    width: position.width + pad * 2,
    height: position.height + pad * 2,
  }
}

/**
 * Transform coordinates from CodeScannerFrame space to preview container space.
 *
 * Key platform differences (from VisionCamera v4 native source code):
 *
 * **iOS** (`CameraSession+CodeScanner.swift`):
 *   - `CodeScannerFrame` = `device.activeFormat.videoDimensions` → always LANDSCAPE (e.g., 1920×1080)
 *   - `code.frame` = `AVMetadataObject.bounds` (normalized 0–1) × videoDimensions
 *   - `AVMetadataObject.bounds` are already orientation-corrected by AVFoundation:
 *     bounds.x = horizontal fraction (left→right), bounds.y = vertical fraction (top→bottom)
 *   - BUT VisionCamera scales them by landscape dims: x*1920, y*1080
 *   - This creates coordinates that are positionally correct but in a mismatched aspect ratio
 *   - Fix: Normalize back to 0–1 fractions, then remap to portrait frame dimensions
 *
 * **Android** (`CodeScannerPipeline.kt`):
 *   - `CodeScannerFrame` = `InputImage.width/height` → RAW (unrotated) dimensions (e.g., 640×480)
 *   - `code.frame` = ML Kit `Barcode.boundingBox` → in ROTATED (portrait) space (e.g., 480×640)
 *   - ML Kit applies `rotationDegrees` internally, returning bounding boxes in upright coords
 *   - But `InputImage.width/height` returns pre-rotation dimensions
 *   - Fix: Swap frame dimensions only (coordinates are already in portrait space)
 *
 * With resizeMode="cover", the camera preview fills the container while maintaining
 * aspect ratio, center-cropping any overflow. We use Math.max(scaleX, scaleY) for
 * the uniform scale and compute centering offsets for the cropped dimension.
 *
 * @param frame Code bounding box in camera sensor coordinate space
 * @param cameraFrameWidth Width reported by CodeScannerFrame
 * @param cameraFrameHeight Height reported by CodeScannerFrame
 * @param containerWidth Width of the camera preview container in pixels
 * @param containerHeight Height of the camera preview container in pixels
 * @param windowDimensions Current window dimensions, used to detect device orientation
 * @returns Bounding box mapped to container coordinate space
 */
export const transformBarcodeCoordinates = (
  frame: Rect,
  cameraFrameWidth: number,
  cameraFrameHeight: number,
  containerWidth: number,
  containerHeight: number,
  windowDimensions: { width: number; height: number }
): Rect => {
  let fw = cameraFrameWidth
  let fh = cameraFrameHeight
  let fx = frame.x
  let fy = frame.y
  let fWidth = frame.width
  let fHeight = frame.height

  // Use WINDOW dimensions to detect device orientation, not container dimensions.
  // The camera container may be wider than tall (e.g., 411×377) even in portrait mode
  // due to UI chrome (nav bars, buttons) consuming vertical space.
  const isDevicePortrait = windowDimensions.height > windowDimensions.width
  const isFrameLandscape = fw > fh

  if (isDevicePortrait) {
    if (Platform.OS === 'ios') {
      // iOS: AVMetadataObject.bounds are in RAW landscape sensor space.
      // VisionCamera scales normalized bounds (0–1) by videoDimensions:
      //   code.x = bounds.x * size.width  (sensor long/short axis)
      //   code.y = bounds.y * size.height  (sensor short/long axis)
      //
      // Normalizing by the SAME dimensions recovers the original 0–1 bounds,
      // regardless of whether size.width > size.height or vice versa.
      //
      // For portrait display, from empirical testing:
      //   bounds.x (sensor "X") corresponds to physical VERTICAL (top-to-bottom)
      //   bounds.y (sensor "Y") corresponds to physical HORIZONTAL (right-to-left, inverted)
      //
      // Portrait mapping - sensor coordinates to display coordinates:
      //   Empirically: boundsY maps to display X (but mirrored: 1-Y-H)
      //                boundsX maps to display Y
      const normX = fx / cameraFrameWidth // recovers bounds.x
      const normY = fy / cameraFrameHeight // recovers bounds.y
      const normW = fWidth / cameraFrameWidth
      const normH = fHeight / cameraFrameHeight

      // Portrait frame: short axis = width, long axis = height
      fw = Math.min(cameraFrameWidth, cameraFrameHeight)
      fh = Math.max(cameraFrameWidth, cameraFrameHeight)

      // Swap axes: sensor Y → display X (mirrored), sensor X → display Y
      fx = (1 - normY - normH) * fw
      fy = normX * fh
      fWidth = normH * fw
      fHeight = normW * fh
    } else if (isFrameLandscape) {
      // Android: ML Kit applies rotationDegrees internally and returns boundingBox
      // in portrait coordinate space (e.g., 480×640), but InputImage.width/height
      // (used for CodeScannerFrame) returns raw unrotated dimensions (e.g., 640×480).
      // Just swap frame dimensions to match the bounding box coordinate space.
      fw = cameraFrameHeight
      fh = cameraFrameWidth
    }
  }

  // Cover mode scaling: use the larger scale factor to fill the container
  const scaleX = containerWidth / fw
  const scaleY = containerHeight / fh
  const scale = Math.max(scaleX, scaleY)

  // Centering offset for the dimension that overflows the container
  const offsetX = (containerWidth - fw * scale) / 2
  const offsetY = (containerHeight - fh * scale) / 2

  return {
    x: fx * scale + offsetX,
    y: fy * scale + offsetY,
    width: fWidth * scale,
    height: fHeight * scale,
  }
}

/**
 * Check if a barcode's bounding box falls within any matching scan zone.
 *
 * When custom `scanZones` are provided, checks against those (with type matching).
 * Otherwise falls back to the default centered scan zone overlay (`scanZoneBounds`).
 *
 * Uses a box-in-zone check, with proportional expansion by `marginFactor` on each side.
 *
 * @param codePosition Detected code's position in container coordinates
 * @param codeType Optional barcode type for type-aware zone matching
 * @param containerSize Dimensions of the camera preview container (null → returns false)
 * @param scanZones Pre-defined scan zones with normalized (0–1) coordinates
 * @param scanZoneBounds Fallback default scan zone in absolute container coordinates
 * @param marginFactor Proportional expansion of zone bounds for alignment tolerance (default 0)
 * @returns true if the code box falls within any matching scan zone (± margin)
 */
export const isCodeAlignedWithZones = (
  codePosition: Rect,
  codeType: string | undefined,
  containerSize: { width: number; height: number } | null,
  scanZones: ScanZone[] | undefined,
  scanZoneBounds: Rect | null,
  marginFactor: number = 0
): boolean => {
  if (!containerSize) {
    return false
  }

  const isFullyWithinBounds = (bounds: Rect, margin: { x: number; y: number }): boolean =>
    codePosition.x >= bounds.x - margin.x &&
    codePosition.y >= bounds.y - margin.y &&
    codePosition.x + codePosition.width <= bounds.x + bounds.width + margin.x &&
    codePosition.y + codePosition.height <= bounds.y + bounds.height + margin.y

  if (scanZones && scanZones.length > 0) {
    return scanZones.some((zone) => {
      // If zone specifies types, only match compatible barcode types
      if (codeType && zone.types.length > 0 && !zone.types.includes(codeType)) {
        return false
      }
      // Convert normalized (0–1) box to absolute container coordinates
      const absX = zone.box.x * containerSize.width
      const absY = zone.box.y * containerSize.height
      const absW = zone.box.width * containerSize.width
      const absH = zone.box.height * containerSize.height

      // Expand zone bounds proportionally for tolerance
      const marginX = absW * marginFactor
      const marginY = absH * marginFactor

      return isFullyWithinBounds({ x: absX, y: absY, width: absW, height: absH }, { x: marginX, y: marginY })
    })
  }

  // Fallback: check against default scan zone overlay bounds
  if (!scanZoneBounds) {
    return false
  }

  const marginX = scanZoneBounds.width * marginFactor
  const marginY = scanZoneBounds.height * marginFactor

  return isFullyWithinBounds(scanZoneBounds, { x: marginX, y: marginY })
}

/**
 * Determine the collective scan state from the current set of enhanced codes.
 *
 * Transitions:
 * - `'scanning'`  — fewer than `minCodesForAligned` qualifying codes detected
 * - `'aligned'`   — enough qualifying codes, but not yet consistently read
 * - `'locked'`    — all qualifying codes have been read ≥ `lockReadingThreshold` times
 *
 * @param codes Enhanced codes from the current scan frame
 * @param options Thresholds and mode flags controlling state transitions
 * @returns The new scan state and the qualifying codes that drove the transition
 */
export const determineScanState = (
  codes: EnhancedCode[],
  options: {
    enableScanZones: boolean
    minCodesForAligned: number
    lockReadingThreshold: number
  }
): { newScanState: ScanState; qualifyingCodes: EnhancedCode[] } => {
  const { enableScanZones, minCodesForAligned, lockReadingThreshold } = options
  const identifiedCodes = codes.filter((c) => c.value && c.value.length > 0)

  // In production mode (enableScanZones OFF), only codes aligned with scan zones
  // (and matching barcode types) drive state transitions. This ensures highlights
  // only turn green / lock when barcodes are in the expected positions.
  // In dev/calibration mode (enableScanZones ON), all identified codes count —
  // this allows capturing scan zones from any position.
  const qualifyingCodes = enableScanZones ? identifiedCodes : identifiedCodes.filter((c) => c.isAligned)

  const qualifyingCount = qualifyingCodes.length
  const allLocked =
    qualifyingCount >= minCodesForAligned && qualifyingCodes.every((c) => (c.readingCount ?? 0) >= lockReadingThreshold)

  let newScanState: ScanState
  if (allLocked) {
    newScanState = 'locked'
  } else if (qualifyingCount >= minCodesForAligned) {
    newScanState = 'aligned'
  } else {
    newScanState = 'scanning'
  }

  return { newScanState, qualifyingCodes }
}

/**
 * Scan zones for the BC Services Card / Driver's License serial number scan screen.
 * Describes the expected position of the Code 39 serial number barcode on a CR-80 ID card.
 * Coordinates are normalized (0–1) relative to the camera container.
 */
export const BCSC_SN_SCAN_ZONES: ScanZone[] = [{ types: ['code-39'], box: { x: 0.1, y: 0.3, width: 0.8, height: 0.1 } }]
