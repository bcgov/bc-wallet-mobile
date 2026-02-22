import { QRScannerTorch, TOKENS, useServices, useTheme } from '@bifold/core'
import { useFocusEffect } from '@react-navigation/native'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Animated,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Reanimated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedProps,
  useSharedValue,
} from 'react-native-reanimated'
import {
  Camera,
  CameraCaptureError,
  CameraProps,
  Code,
  CodeScannerFrame,
  CodeType,
  useCameraDevice,
  useCameraFormat,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera'

import { useBCSCActivity } from '../contexts/BCSCActivityContext'
import {
  EnhancedCode,
  Rect,
  ScanState,
  ScanZone,
  calculateBarcodeOrientation,
  clampZoom,
  determineScanState,
  getPaddedHighlightPosition,
  isCodeAlignedWithZones,
  transformBarcodeCoordinates,
} from './utils/camera'

export type { EnhancedCode, ScanZone }

Reanimated.addWhitelistedNativeProps({ zoom: true })
const ReanimatedCamera = Reanimated.createAnimatedComponent(Camera)

/**
 * How far the pinch gesture scales to reach the full device zoom range.
 * A 3× pinch covers the entire min→max zoom range.
 */
const PINCH_SCALE_FULL_ZOOM = 3

export interface CodeScanningCameraProps {
  /**
   * Callback function called when a code is successfully scanned
   * @param codes Array of scanned codes with position and orientation metadata
   * @param frame The camera frame information
   */
  onCodeScanned: (codes: EnhancedCode[], frame: CodeScannerFrame) => void

  /**
   * Custom style for the camera container
   */
  style?: ViewStyle

  /**
   * Which camera to use
   * @default 'back'
   */
  cameraType?: 'front' | 'back'

  /**
   * Enable/disable barcode highlight overlay
   * When enabled, shows visual feedback for detected barcodes
   * @default false
   */
  showBarcodeHighlight?: boolean

  /**
   * Enable scan zone tracking and saving (dev/debug feature).
   * When enabled and locked, shows Save Scan Zones + Continue Scanning buttons.
   * When disabled and locked, shows a Confirm button that calls onCodeScanned.
   * @default false
   */
  enableScanZones?: boolean

  /**
   * Pre-defined scan zones describing expected barcode positions on the card.
   * Each zone defines where a barcode is expected (type + normalized 0-1 box coords).
   * Used for alignment detection, zone-based focus cycling, and overlay rendering.
   * Use the output of "Save Scan Zones" to populate this prop.
   */
  scanZones: ScanZone[]

  /**
   * Initial zoom level
   * @default 2
   */
  initialZoom?: number
}

/** Feature flag: when true, shows Confirm/Try Again buttons on lock.
 *  When false (default), automatically confirms and proceeds with the scan. */
const ENABLE_MANUAL_CONFIRM = false

const CodeScanningCamera: React.FC<CodeScanningCameraProps> = ({
  onCodeScanned,
  style,
  cameraType = 'back',
  showBarcodeHighlight = false,
  enableScanZones = false,
  scanZones,
  initialZoom = 2,
}) => {
  // Derive scanner code types from the declared scan zones (deduped)
  const codeTypes = [...new Set(scanZones.flatMap((z) => z.types))] as CodeType[]

  const { t } = useTranslation()
  const { ColorPalette, Spacing } = useTheme()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { pauseActivityTracking, resumeActivityTracking } = useBCSCActivity()
  const camera = useRef<Camera>(null)
  const [torchEnabled, setTorchEnabled] = useState(false)
  const { width, height: windowHeight } = useWindowDimensions()
  const { hasPermission, requestPermission } = useCameraPermission()
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null)
  const focusOpacity = useRef(new Animated.Value(0)).current
  const focusScale = useRef(new Animated.Value(1)).current

  // Zoom management – uses Reanimated shared value for smooth pinch-to-zoom
  const zoom = useSharedValue(1)
  const zoomOffset = useSharedValue(0)
  const [zoomDisplay, setZoomDisplay] = useState(1)

  // Barcode highlight state
  const [detectedCodes, setDetectedCodes] = useState<EnhancedCode[]>([])
  const highlightFadeAnim = useRef(new Animated.Value(0)).current

  // Track if we're currently processing a scan to prevent multiple callbacks
  const isProcessingScan = useRef(false)
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const clearHighlightTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Track locked state inside scanner callback closure (React state is stale in callback)
  const isLockedRef = useRef(false)
  // Store locked codes and frame for deferred callback when user taps "Continue"
  const lockedScanRef = useRef<{ codes: EnhancedCode[]; frame: CodeScannerFrame } | null>(null)

  // --- Configurable highlight thresholds ---
  // Consecutive identical readings required per code for "locked" state (green with border)
  const LOCK_READING_THRESHOLD = 5
  // Alignment tolerance for scan zone matching (proportional to zone size)
  const ALIGNMENT_MARGIN_FACTOR = 0.05

  // Track consecutive readings for validation
  // iOS detects reliably at full resolution — use higher threshold for certainty
  // Android detects less frequently — lower threshold to reduce user frustration
  const barcodeReadings = useRef<Map<string, { value: string; type: CodeType | 'unknown'; count: number }>>(new Map())
  const VALIDATION_THRESHOLD = Platform.OS === 'ios' ? 5 : 3

  // Collective scan state: 'scanning' → 'aligned' → 'locked'
  const [scanState, setScanState] = useState<ScanState>('scanning')

  // Scan-and-accumulate: track validated codes across frames within a time window.
  // This allows PDF-417 and Code-39 to be detected in separate frames rather than
  // requiring both in the same frame — a huge improvement on Android where the lower
  // resolution and ML Kit processing make simultaneous detection unreliable.
  const accumulatedCodes = useRef<Map<string, { code: EnhancedCode; timestamp: number }>>(new Map())
  const ACCUMULATION_WINDOW_MS = Platform.OS === 'ios' ? 2000 : 3000

  // Track camera container and preview dimensions for coordinate transformation
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null)
  const [frameSize, setFrameSize] = useState<{ width: number; height: number } | null>(null)

  // Track scan zone position for alignment detection
  const [scanZoneBounds, setScanZoneBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(
    null
  )

  // Frozen camera preview — stores a snapshot URI when scanning is locked
  const [frozenFrameUri, setFrozenFrameUri] = useState<string | null>(null)

  /**
   * Select the optimal camera device for barcode scanning
   * Prioritizes devices with better focus capabilities and macro support for dense PDF-417 codes
   */
  const device = useCameraDevice(cameraType, {
    physicalDevices: Platform.select({
      // On iOS, prefer telephoto for better zoom/focus on dense barcodes, then ultra-wide for focus control
      ios: ['telephoto-camera', 'ultra-wide-angle-camera', 'wide-angle-camera'],
      // On Android, prefer wide-angle camera
      android: ['wide-angle-camera'],
    }),
  })

  /**
   * Optimize camera format for barcode scanning including dense PDF-417
   *
   * Key considerations:
   * - 1080p (1920x1080) provides sufficient resolution for PDF-417 barcodes
   *   (Google ML Kit recommends >=1156px width for dense PDF-417)
   * - 30 FPS gives 3x more scanning opportunities than 10 FPS, increasing the
   *   chance of capturing both barcodes in the time window
   * - On Android, the patched native code now uses this videoResolution for the
   *   code scanner's ImageAnalysis pipeline (previously defaulted to ~640x480)
   * - On iOS, AVFoundation uses the full active format resolution regardless
   */
  const format = useCameraFormat(device, [
    // 1080p video resolution — sufficient for PDF-417 (>=1156px) while keeping
    // processing fast on Android. The native patch ensures this resolution is
    // actually used by the code scanner's ImageAnalysis pipeline.
    {
      videoResolution: { width: 1920, height: 1080 },
    },
    // 30 FPS provides more scan attempts per second — critical for catching both
    // PDF-417 and Code-39 within the accumulation window
    {
      fps: 30,
    },
    // Prefer formats with better video stabilization
    {
      videoStabilizationMode: 'auto',
    },
  ])

  // Calculate effective zoom based on device capabilities
  const getEffectiveZoom = useCallback(
    (targetZoom: number) => {
      if (!device) {
        return targetZoom
      }
      return clampZoom(targetZoom, device.minZoom ?? 1, device.maxZoom ?? 10)
    },
    [device]
  )

  /**
   * Enhanced tap-to-focus animation handler
   * Shows a visual indicator where the user tapped to focus
   */
  const drawFocusTap = useCallback(
    (point: { x: number; y: number }): void => {
      setFocusPoint(point)

      focusOpacity.setValue(1)
      focusScale.setValue(1.5)

      Animated.parallel([
        Animated.timing(focusOpacity, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(focusScale, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setFocusPoint(null)
      })
    },
    [focusOpacity, focusScale]
  )

  // Derived zoom bounds for the pinch gesture worklet
  const minZoomValue = device?.minZoom ?? 1
  const maxZoomValue = Math.min(device?.maxZoom ?? 10, 20)

  // Animated zoom props for the ReanimatedCamera
  const animatedProps = useAnimatedProps<CameraProps>(() => ({ zoom: zoom.value }), [zoom])

  // Pinch-to-zoom gesture — maps linear pinch scale to the camera's zoom range
  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      zoomOffset.value = zoom.value
    })
    .onUpdate((event) => {
      // Double interpolation for natural-feeling zoom:
      // 1) Map the raw pinch scale [1/3 … 1 … 3] → [-1 … 0 … 1]
      const scale = interpolate(
        event.scale,
        [1 - 1 / PINCH_SCALE_FULL_ZOOM, 1, PINCH_SCALE_FULL_ZOOM],
        [-1, 0, 1],
        Extrapolation.CLAMP
      )
      // 2) Map [-1 … 0 … 1] → [minZoom … startZoom … maxZoom]
      const newZoom = interpolate(
        scale,
        [-1, 0, 1],
        [minZoomValue, zoomOffset.value, maxZoomValue],
        Extrapolation.CLAMP
      )
      zoom.value = newZoom
      runOnJS(setZoomDisplay)(newZoom)
    })

  // Tap-to-focus gesture (replaces the Pressable overlay)
  const focusByTap = useCallback(
    async (point: { x: number; y: number }) => {
      if (!device?.supportsFocus || !camera.current) {
        return
      }
      drawFocusTap(point)
      try {
        await camera.current.focus(point)
      } catch (error) {
        if (error instanceof CameraCaptureError && error.code === 'capture/focus-canceled') {
          return
        }
        throw error
      }
    },
    [device?.supportsFocus, drawFocusTap]
  )

  const tapGesture = Gesture.Tap().onEnd((event) => {
    runOnJS(focusByTap)({ x: event.x, y: event.y })
  })

  // Compose pinch + tap; disable while scanning is locked so overlay buttons work
  const isGestureEnabled = scanState !== 'locked'
  const composedGesture = Gesture.Simultaneous(
    pinchGesture.enabled(isGestureEnabled),
    tapGesture.enabled(isGestureEnabled)
  )

  // --- Helpers extracted from onCodeScanned to reduce cognitive complexity ---

  /** Enhance a single barcode with position, orientation, alignment, and validation metadata */
  const enhanceSingleCode = (code: Code): EnhancedCode => {
    let position: { x: number; y: number; width: number; height: number } | undefined

    // Use the frame property which is already relative to the Camera Preview
    if (code.frame && containerSize && frameSize) {
      // Transform coordinates from camera sensor space to container space
      position = transformBarcodeCoordinates(
        code.frame,
        frameSize.width,
        frameSize.height,
        containerSize.width,
        containerSize.height,
        { width, height: windowHeight }
      )
    } else if (code.frame) {
      // Fallback to untransformed coordinates if we don't have dimensions yet
      position = code.frame
    }

    const corners = code.corners
    const orientation = calculateBarcodeOrientation(corners)

    // Check if code is aligned with scan zone (pass type for custom zone matching)
    const isAligned = position ? isCodeAlignedWithScanZone(position, code.type, ALIGNMENT_MARGIN_FACTOR) : false

    // Validate through consecutive readings (only if aligned)
    const key = `${code.type}-${code.value}`
    let readingCount = 1
    let isValidated = false

    // Always track consecutive readings for any code with a value —
    // this drives the visual lock state (readingCount >= LOCK_READING_THRESHOLD).
    // But only mark as "validated" (for triggering the scan callback) when also aligned.
    if (code.value) {
      const existing = barcodeReadings.current.get(key)
      if (existing && existing.value === code.value && existing.type === code.type) {
        // Same code detected consecutively - increment count
        readingCount = existing.count + 1
        barcodeReadings.current.set(key, { value: code.value, type: code.type, count: readingCount })
      } else {
        // New code or changed value - reset count
        barcodeReadings.current.set(key, { value: code.value, type: code.type, count: 1 })
      }
      // Only validated (for callback) if ALSO aligned with scan zone
      isValidated = isAligned && readingCount >= VALIDATION_THRESHOLD
    }

    return {
      ...code,
      position,
      orientation,
      isAligned,
      isValidated,
      readingCount,
    }
  }

  /** Remove readings for barcodes no longer detected in the current scan frame */
  const cleanupStaleReadings = (currentScanKeys: Set<string>) => {
    const keysToDelete: string[] = []
    barcodeReadings.current.forEach((_, key) => {
      if (!currentScanKeys.has(key)) {
        keysToDelete.push(key)
      }
    })
    keysToDelete.forEach((key) => barcodeReadings.current.delete(key))
  }

  /** Update per-zone detection tracking for focus cycling prioritisation */
  const updateZoneDetectionTracking = (enhancedCodes: EnhancedCode[]) => {
    if (scanZones.length === 0 || !containerSize) {
      return
    }
    const newDetected = new Set<number>()
    for (const code of enhancedCodes) {
      if (!code.isAligned || !code.position) {
        continue
      }
      // Determine which zone index this aligned code belongs to
      for (let zi = 0; zi < scanZones.length; zi++) {
        const zone = scanZones[zi]
        if (code.type && zone.types.length > 0 && !zone.types.includes(code.type)) {
          continue
        }
        const absX = zone.box.x * containerSize.width
        const absY = zone.box.y * containerSize.height
        const absW = zone.box.width * containerSize.width
        const absH = zone.box.height * containerSize.height
        const mx = absW * ALIGNMENT_MARGIN_FACTOR
        const my = absH * ALIGNMENT_MARGIN_FACTOR
        if (
          code.position.x >= absX - mx &&
          code.position.y >= absY - my &&
          code.position.x + code.position.width <= absX + absW + mx &&
          code.position.y + code.position.height <= absY + absH + my
        ) {
          newDetected.add(zi)
          break
        }
      }
    }
    detectedZoneIndices.current = newDetected
  }

  /** Determine the collective scan state based on qualifying aligned codes */
  const computeScanState = (
    enhancedCodes: EnhancedCode[]
  ): { newScanState: ScanState; qualifyingCodes: EnhancedCode[] } =>
    determineScanState(enhancedCodes, {
      enableScanZones,
      minCodesForAligned: scanZones.length,
      lockReadingThreshold: LOCK_READING_THRESHOLD,
    })

  /** Update barcode highlight overlays with fade animations */
  const updateBarcodeHighlights = (enhancedCodes: EnhancedCode[], newScanState: ScanState) => {
    if (!showBarcodeHighlight) {
      return
    }

    // Clear any pending clear timeout since we have detected codes
    if (clearHighlightTimeoutRef.current) {
      clearTimeout(clearHighlightTimeoutRef.current)
      clearHighlightTimeoutRef.current = null
    }

    // Update if codes changed OR if position changed (for real-time tracking as camera moves)
    const codesChanged =
      detectedCodes.length !== enhancedCodes.length ||
      enhancedCodes.some(
        (code, idx) =>
          !detectedCodes[idx] ||
          detectedCodes[idx].value !== code.value ||
          detectedCodes[idx].type !== code.type ||
          // Track position changes for live updates as camera moves
          (code.position &&
            detectedCodes[idx].position &&
            (Math.abs(code.position.x - detectedCodes[idx].position!.x) > 5 ||
              Math.abs(code.position.y - detectedCodes[idx].position!.y) > 5 ||
              Math.abs(code.position.width - detectedCodes[idx].position!.width) > 5 ||
              Math.abs(code.position.height - detectedCodes[idx].position!.height) > 5))
      )

    if (codesChanged) {
      setDetectedCodes(enhancedCodes)

      // Fade in the highlight
      Animated.timing(highlightFadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start()
    }

    // Set a timeout to clear highlights if no codes are detected for 500ms
    // Skip when locked — highlights should persist until user action
    if (newScanState !== 'locked') {
      clearHighlightTimeoutRef.current = setTimeout(() => {
        setDetectedCodes([])
        Animated.timing(highlightFadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start()
      }, 500)
    }
  }

  /** Accumulate validated+aligned codes across frames within a time window */
  const accumulateValidatedResults = (enhancedCodes: EnhancedCode[]) => {
    const now = Date.now()
    const newlyValidated = enhancedCodes.filter((code) => code.isAligned && code.isValidated)

    // Add/update validated codes in the accumulator
    newlyValidated.forEach((code) => {
      const key = `${code.type}-${code.value}`
      accumulatedCodes.current.set(key, { code, timestamp: now })
    })

    // Expire old detections outside the accumulation window
    accumulatedCodes.current.forEach((entry, key) => {
      if (now - entry.timestamp > ACCUMULATION_WINDOW_MS) {
        accumulatedCodes.current.delete(key)
      }
    })
  }

  /** Handle the lock state transition when all qualifying codes are consistently detected */
  const handleLockTransition = (qualifyingCodes: EnhancedCode[], frame: CodeScannerFrame, newScanState: ScanState) => {
    if (newScanState !== 'locked' || isLockedRef.current) {
      return
    }
    // Freeze scanning — user must tap "Confirm" or "Try Again"
    // newScanState === 'locked' already guarantees ≥2 qualifying codes with ≥5 consecutive readings each
    isLockedRef.current = true
    lockedScanRef.current = { codes: qualifyingCodes, frame }
    // Cancel any clear timeout so highlights persist
    if (clearHighlightTimeoutRef.current) {
      clearTimeout(clearHighlightTimeoutRef.current)
      clearHighlightTimeoutRef.current = null
    }
  }

  /** Handle when no codes are detected — clear highlights and reset readings */
  const handleNoCodesDetected = () => {
    if (isLockedRef.current) {
      return
    }
    // Clear highlights and validation readings when no codes are detected
    // (but never reset if locked — highlights are frozen)
    detectedZoneIndices.current = new Set()
    setScanState('scanning')
    if (showBarcodeHighlight && detectedCodes.length > 0) {
      setDetectedCodes([])
      // Fade out the highlight
      Animated.timing(highlightFadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start()
    }
    // Clear validation readings when no codes detected (but keep accumulated codes —
    // they expire via the time window, allowing brief gaps in detection)
    barcodeReadings.current.clear()
  }

  /**
   * Enhanced code scanner with position and orientation metadata
   * Pauses scanning while processing detected codes to prevent multiple callbacks
   * Requires at least 2 codes to proceed (barcode + license or combo card detection)
   */
  const codeScanner = useCodeScanner({
    codeTypes,
    onCodeScanned: (codes, frame) => {
      // Capture frame dimensions on first scan
      if (!frameSize) {
        setFrameSize({ width: frame.width, height: frame.height })
      }

      // When locked, completely pause scanning — highlights are frozen on screen
      if (isLockedRef.current) {
        return
      }

      if (codes.length === 0) {
        handleNoCodesDetected()
        return
      }

      // Enhance codes with position and orientation metadata
      const enhancedCodes = codes.map(enhanceSingleCode)
      const currentScanKeys = new Set(enhancedCodes.map((c) => `${c.type}-${c.value}`))
      cleanupStaleReadings(currentScanKeys)
      updateZoneDetectionTracking(enhancedCodes)
      const { newScanState, qualifyingCodes } = computeScanState(enhancedCodes)
      setScanState(newScanState)
      updateBarcodeHighlights(enhancedCodes, newScanState)
      accumulateValidatedResults(enhancedCodes)
      handleLockTransition(qualifyingCodes, frame, newScanState)
    },
  })

  useEffect(() => {
    if (!hasPermission) {
      requestPermission()
    }

    // Cleanup timeout on unmount
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current)
        highlightTimeoutRef.current = null
      }
      if (clearHighlightTimeoutRef.current) {
        clearTimeout(clearHighlightTimeoutRef.current)
        clearHighlightTimeoutRef.current = null
      }
      if (focusCycleTimerRef.current) {
        clearInterval(focusCycleTimerRef.current)
        focusCycleTimerRef.current = null
      }
    }
  }, [hasPermission, requestPermission])

  // Auto-confirm: when manual confirm is disabled, immediately fire the callback on lock
  useEffect(() => {
    if (!ENABLE_MANUAL_CONFIRM && scanState === 'locked' && lockedScanRef.current) {
      onCodeScanned(lockedScanRef.current.codes, lockedScanRef.current.frame)
    }
  }, [scanState, onCodeScanned])

  // Capture a snapshot to freeze the camera preview when scanning locks
  useEffect(() => {
    if (scanState === 'locked' && camera.current && !frozenFrameUri) {
      camera.current
        .takeSnapshot({ quality: 85 })
        .then((photo) => {
          setFrozenFrameUri(`file://${photo.path}`)
        })
        .catch((err) => {
          // On failure, the camera will simply be deactivated (isActive=false)
          // which retains the last frame on iOS. On Android the preview may go black.
          logger.debug('Could not capture frozen frame snapshot', { error: String(err) })
        })
    }
  }, [scanState, frozenFrameUri, logger])

  const scanSize = Math.min(width - 80, 300)
  const scanAreaDimensions = { width: scanSize, height: scanSize / 4 }

  const getHighlightPosition = useCallback((position: Rect) => getPaddedHighlightPosition(position), [])

  /**
   * Check if a code's box falls within a scan zone (with proportional margin).
   * When custom `scanZones` are provided, checks against those (with type matching).
   * Otherwise falls back to the default centered scan zone overlay.
   *
   * Uses a box-in-zone check for alignment, with proportional expansion by
   * `marginFactor` on each side. This keeps highlights closely matched to
   * the scan zone while allowing a small tolerance when needed.
   *
   * @param codePosition The detected code's position in container coordinates
   * @param codeType Optional barcode type for type-aware matching with custom zones
   * @param marginFactor Proportional expansion of zone bounds (default 0.3 = 30%)
   * @returns true if the code box is within any matching scan zone (± margin)
   */
  const isCodeAlignedWithScanZone = useCallback(
    (codePosition: Rect, codeType?: string, marginFactor: number = 0): boolean =>
      isCodeAlignedWithZones(codePosition, codeType, containerSize, scanZones, scanZoneBounds, marginFactor),
    [containerSize, scanZones, scanZoneBounds]
  )

  // Track which scan zone indices currently have aligned barcode detections.
  // Updated every scan frame so focus cycling can prioritise empty zones.
  const detectedZoneIndices = useRef<Set<number>>(new Set())

  // Auto-focus cycling: periodically focus on scan zone centers
  const focusCycleIndex = useRef(0)
  const focusCycleTimerRef = useRef<NodeJS.Timeout | null>(null)
  const FOCUS_CYCLE_INTERVAL_MS = 2500 // Cycle focus every 2.5 seconds

  const startFocusCycling = useCallback(() => {
    if (scanZones.length === 0 || !containerSize || !device?.supportsFocus) {
      return
    }

    // Clear any existing timer
    if (focusCycleTimerRef.current) {
      clearInterval(focusCycleTimerRef.current)
    }

    const doFocus = () => {
      if (!camera.current || isLockedRef.current || !containerSize) {
        return
      }

      // Prefer zones that have NOT yet detected a barcode
      const undetectedIndices = scanZones.map((_, i) => i).filter((i) => !detectedZoneIndices.current.has(i))

      let zoneIndex: number
      if (undetectedIndices.length > 0) {
        // Cycle through undetected zones
        zoneIndex = undetectedIndices[focusCycleIndex.current % undetectedIndices.length]
      } else {
        // All zones have detections — fall back to normal round-robin
        zoneIndex = focusCycleIndex.current % scanZones.length
      }

      const zone = scanZones[zoneIndex]

      // Focus on the center of the scan zone (in container coordinates)
      const focusX = (zone.box.x + zone.box.width / 2) * containerSize.width
      const focusY = (zone.box.y + zone.box.height / 2) * containerSize.height

      camera.current.focus({ x: focusX, y: focusY }).catch((err) => {
        // Silently ignore focus errors (canceled, not supported, etc.)
        if (!(err instanceof CameraCaptureError && err.code === 'capture/focus-canceled')) {
          logger.debug('Auto-focus cycle error', { zone: zoneIndex, undetected: undetectedIndices, error: String(err) })
        }
      })

      focusCycleIndex.current += 1
    }

    // Focus immediately on first zone, then cycle
    doFocus()
    focusCycleTimerRef.current = setInterval(doFocus, FOCUS_CYCLE_INTERVAL_MS)
  }, [scanZones, containerSize, device, logger])

  const stopFocusCycling = useCallback(() => {
    if (focusCycleTimerRef.current) {
      clearInterval(focusCycleTimerRef.current)
      focusCycleTimerRef.current = null
    }
  }, [])

  // Start/stop focus cycling based on scan state
  useEffect(() => {
    if (scanState === 'locked') {
      stopFocusCycling()
    } else if (containerSize && device?.supportsFocus) {
      startFocusCycling()
    }
    return stopFocusCycling
  }, [scanState, containerSize, startFocusCycling, stopFocusCycling, device])

  useFocusEffect(
    useCallback(() => {
      // Pause inactivity timeout while camera is active to prevent auto-lock during scanning
      pauseActivityTracking()

      // Reset zoom when screen comes into focus
      const targetZoom = getEffectiveZoom(initialZoom)
      logger.debug('Screen focused, applying zoom', { zoom: targetZoom })
      zoom.value = targetZoom
      setZoomDisplay(targetZoom)

      // Reset zoom and resume activity tracking when screen loses focus
      return () => {
        setTorchEnabled(false)
        stopFocusCycling()
        const resetZoom = getEffectiveZoom(initialZoom)
        zoom.value = resetZoom
        setZoomDisplay(resetZoom)
        resumeActivityTracking()
      }
    }, [pauseActivityTracking, getEffectiveZoom, initialZoom, logger, stopFocusCycling, resumeActivityTracking, zoom])
  )

  const toggleTorch = () => {
    setTorchEnabled((prev) => !prev)
  }

  /**
   * Handler for camera initialization
   * Sets the zoom level once the camera is fully initialized and ready
   */
  const handleCameraInitialized = useCallback(() => {
    const targetZoom = getEffectiveZoom(initialZoom)
    logger.debug('Camera initialized', {
      minZoom: device?.minZoom,
      maxZoom: device?.maxZoom,
      requestedZoom: initialZoom,
      effectiveZoom: targetZoom,
      formatVideo: format ? `${format.videoWidth}×${format.videoHeight}` : 'none',
      formatPhoto: format ? `${format.photoWidth}×${format.photoHeight}` : 'none',
    })
    zoom.value = targetZoom
    setZoomDisplay(targetZoom)
    logger.debug('Zoom applied after initialization', { zoom: targetZoom })
  }, [initialZoom, getEffectiveZoom, logger, device, format, zoom])

  const handleSaveScanZones = useCallback(() => {
    if (!containerSize || !frameSize) {
      Alert.alert('Not Ready', 'Camera dimensions not available yet.')
      return
    }

    const scanZones = detectedCodes
      .filter((c) => c.value && c.position)
      .map((c) => ({
        types: [c.type],
        // Normalized coordinates (0-1) relative to container — platform agnostic
        box: {
          x: +(c.position!.x / containerSize.width).toFixed(4),
          y: +(c.position!.y / containerSize.height).toFixed(4),
          width: +(c.position!.width / containerSize.width).toFixed(4),
          height: +(c.position!.height / containerSize.height).toFixed(4),
        },
      }))

    const data = {
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      containerDimensions: containerSize,
      scanZones,
    }

    logger.info('Saved scan zone coordinates', data)

    // Log to Metro console for easy copy-paste
    // eslint-disable-next-line no-console
    console.log('\n=== SCAN ZONE COORDINATES ===')
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(data, null, 2))
    // eslint-disable-next-line no-console
    console.log('=== END SCAN ZONE COORDINATES ===\n')

    Alert.alert(
      'Scan Zones Saved',
      `Captured ${scanZones.length} barcode(s).\nCoordinates logged to Metro console.\n\n` +
        scanZones
          .map((b) => `${b.types.join(',')}: (${b.box.x}, ${b.box.y}) ${b.box.width}\u00D7${b.box.height}`)
          .join('\n'),
      [{ text: 'OK' }]
    )
  }, [detectedCodes, containerSize, frameSize, logger])

  const resetScanningState = useCallback(() => {
    isLockedRef.current = false
    lockedScanRef.current = null
    isProcessingScan.current = false
    setFrozenFrameUri(null)
    setScanState('scanning')
    barcodeReadings.current.clear()
    accumulatedCodes.current.clear()
    setDetectedCodes([])

    // Clean up any pending timeouts
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current)
      highlightTimeoutRef.current = null
    }
    if (clearHighlightTimeoutRef.current) {
      clearTimeout(clearHighlightTimeoutRef.current)
      clearHighlightTimeoutRef.current = null
    }

    // Fade out highlights
    Animated.timing(highlightFadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }, [highlightFadeAnim])

  /** Resume scanning without firing the callback (used in scan zone mode) */
  const handleContinueScanning = useCallback(() => {
    resetScanningState()
  }, [resetScanningState])

  /** Confirm the locked scan — fires the parent callback without resuming the camera.
   *  The parent is expected to navigate away; if it doesn't, the user can tap "Try Again". */
  const handleConfirmScan = useCallback(() => {
    const locked = lockedScanRef.current
    if (locked) {
      onCodeScanned(locked.codes, locked.frame)
    }
  }, [onCodeScanned])

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPalette.brand.primaryBackground,
      position: 'relative',
    },
    cameraContainer: {
      flex: 1,
      position: 'relative',
      overflow: 'hidden',
    },
    camera: {
      flex: 1,
    },
    overlayContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
    },
    overlayOpening: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: scanAreaDimensions.width,
      height: scanAreaDimensions.height,
      marginTop: -scanAreaDimensions.height / 2,
      marginLeft: -scanAreaDimensions.width / 2,
      borderRadius: 4,
      borderColor: ColorPalette.brand.primary,
      borderWidth: 3,
    },
    torchContainer: {
      position: 'absolute',
      right: Spacing.md,
      top: Spacing.lg,
    },
    focusIndicator: {
      position: 'absolute',
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 2,
      borderColor: ColorPalette.grayscale.white,
      backgroundColor: 'transparent',
    },
    barcodeHighlight: {
      position: 'absolute',
      borderWidth: 2,
    },
    barcodeHighlightScanning: {
      borderColor: '#FF6600',
      backgroundColor: 'rgba(255, 102, 0, 0.15)',
    },
    barcodeHighlightAligned: {
      borderWidth: 0,
      backgroundColor: 'rgba(0, 255, 0, 0.15)',
    },
    barcodeHighlightLocked: {
      borderColor: '#00FF00',
      borderWidth: 3,
      backgroundColor: 'rgba(0, 255, 0, 0.25)',
    },
    saveButton: {
      backgroundColor: 'rgba(0, 180, 0, 0.9)',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    saveButtonText: {
      color: 'white',
      fontSize: 14,
      fontWeight: 'bold',
    },
    lockedButtonsContainer: {
      position: 'absolute',
      top: 20,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 10,
      zIndex: 10,
    },
    continueButton: {
      backgroundColor: 'rgba(0, 120, 255, 0.9)',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    continueButtonText: {
      color: 'white',
      fontSize: 14,
      fontWeight: 'bold',
    },
    confirmButton: {
      backgroundColor: 'rgba(0, 120, 255, 0.9)',
      paddingHorizontal: 28,
      paddingVertical: 14,
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    confirmButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
    },
    zoomIndicator: {
      position: 'absolute',
      top: 50,
      right: Spacing.md,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      paddingHorizontal: 5,
      paddingVertical: 6,
      borderRadius: 8,
      minWidth: 60,
      alignItems: 'center',
    },
    zoomText: {
      color: 'white',
      fontSize: 10,
      fontWeight: 'bold',
    },
  })

  // handleFocusTap removed — tap-to-focus is now handled by tapGesture (see composedGesture)

  if (!device || !hasPermission) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'white' }}>{t('BCSC.CameraDisclosure.CameraPermissionRequired')}</Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, style]}>
      <View
        style={styles.cameraContainer}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout
          setContainerSize({ width, height })
          logger.debug('Camera container size', { width, height })
        }}
      >
        {/* 
            resizeMode="cover" fills the container without black bars by cropping the camera feed.
            The coordinate transformation logic accounts for the cropped portion to ensure
            highlight boxes align correctly with visible barcodes.
          */}
        <ReanimatedCamera
          ref={camera}
          style={styles.camera}
          device={device}
          format={format}
          isActive={hasPermission && !frozenFrameUri}
          video={true}
          codeScanner={codeScanner}
          torch={torchEnabled ? 'on' : 'off'}
          animatedProps={animatedProps}
          onInitialized={handleCameraInitialized}
          resizeMode="cover"
        />

        {/* Frozen frame overlay — shows last camera frame when scanning is locked */}
        {frozenFrameUri && (
          <Image source={{ uri: frozenFrameUri }} style={[StyleSheet.absoluteFill, { zIndex: 1 }]} resizeMode="cover" />
        )}

        {/* Overlay container for highlights and focus indicator */}
        <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none', zIndex: 2 }]}>
          {/* Debug: Scan zone outlines — shows where we expect barcodes (iOS diagnostic) */}
          {showBarcodeHighlight &&
            enableScanZones &&
            scanZones &&
            containerSize &&
            scanZones.map((zone) => (
              <View
                key={`debug-zone-${zone.types.join('-')}-${zone.box.x}-${zone.box.y}`}
                style={{
                  position: 'absolute',
                  left: zone.box.x * containerSize.width,
                  top: zone.box.y * containerSize.height,
                  width: zone.box.width * containerSize.width,
                  height: zone.box.height * containerSize.height,
                  borderWidth: 2,
                  borderColor: '#00FFFF',
                  borderStyle: 'dashed',
                  backgroundColor: 'rgba(0, 255, 255, 0.1)',
                }}
              />
            ))}

          {/* Debug: Center crosshair diagnostic — maps image center through our transform.
                If transform is correct, this yellow crosshair should be at the exact center
                of the camera preview. Any offset reveals a coordinate mapping error. */}
          {showBarcodeHighlight &&
            enableScanZones &&
            frameSize &&
            containerSize &&
            (() => {
              // Map the center of the ImageAnalysis frame through our transform
              const centerFrame = {
                x: 0,
                y: 0,
                // Use a small rect at center of the portrait-oriented frame
                width: 4,
                height: 4,
              }
              // In portrait space, center is at (fw/2, fh/2)
              // where fw=min(frameW,frameH), fh=max(frameW,frameH)
              const fw = Math.min(frameSize.width, frameSize.height)
              const fh = Math.max(frameSize.width, frameSize.height)
              centerFrame.x = fw / 2 - 2
              centerFrame.y = fh / 2 - 2

              const scaleX = containerSize.width / fw
              const scaleY = containerSize.height / fh
              const scale = Math.max(scaleX, scaleY)
              const offsetX = (containerSize.width - fw * scale) / 2
              const offsetY = (containerSize.height - fh * scale) / 2

              const cx = centerFrame.x * scale + offsetX
              const cy = centerFrame.y * scale + offsetY

              // Also compute 25% and 75% reference points
              const q1x = fw * 0.25 * scale + offsetX
              const q1y = fh * 0.25 * scale + offsetY
              const q3x = fw * 0.75 * scale + offsetX
              const q3y = fh * 0.75 * scale + offsetY

              return (
                <>
                  {/* Center crosshair — should be at exact center of preview */}
                  <View
                    style={{
                      position: 'absolute',
                      left: cx - 15,
                      top: cy - 1,
                      width: 30,
                      height: 2,
                      backgroundColor: 'yellow',
                    }}
                  />
                  <View
                    style={{
                      position: 'absolute',
                      left: cx - 1,
                      top: cy - 15,
                      width: 2,
                      height: 30,
                      backgroundColor: 'yellow',
                    }}
                  />
                  {/* 25% marker (top-left quadrant) */}
                  <View
                    style={{
                      position: 'absolute',
                      left: q1x - 5,
                      top: q1y - 1,
                      width: 10,
                      height: 2,
                      backgroundColor: 'cyan',
                    }}
                  />
                  <View
                    style={{
                      position: 'absolute',
                      left: q1x - 1,
                      top: q1y - 5,
                      width: 2,
                      height: 10,
                      backgroundColor: 'cyan',
                    }}
                  />
                  {/* 75% marker (bottom-right quadrant) */}
                  <View
                    style={{
                      position: 'absolute',
                      left: q3x - 5,
                      top: q3y - 1,
                      width: 10,
                      height: 2,
                      backgroundColor: 'magenta',
                    }}
                  />
                  <View
                    style={{
                      position: 'absolute',
                      left: q3x - 1,
                      top: q3y - 5,
                      width: 2,
                      height: 10,
                      backgroundColor: 'magenta',
                    }}
                  />
                </>
              )
            })()}

          {/* Barcode highlight overlay - rendered inside camera view for correct positioning */}
          {showBarcodeHighlight &&
            detectedCodes.map((code) => {
              if (!code.position) {
                return null
              }

              // Highlight style is based on COLLECTIVE scan state, not per-code
              let highlightStyle
              if (scanState === 'locked') {
                highlightStyle = styles.barcodeHighlightLocked
              } else if (scanState === 'aligned') {
                highlightStyle = styles.barcodeHighlightAligned
              } else {
                highlightStyle = styles.barcodeHighlightScanning
              }

              // Show decoded value inside highlight for 1D barcodes (code-39, code-128)
              const show1DValue = (code.type === 'code-39' || code.type === 'code-128') && code.value
              // Scale font to fit: use box height as baseline, shrink if text is too wide
              const maxFontForHeight = Math.max(8, Math.min(code.position.height * 0.6, 16))
              // Estimate chars that fit at this font size (~0.6 char-width ratio for monospace)
              const charsAtMaxFont = code.position.width / (maxFontForHeight * 0.6)
              const valueLen = code.value?.length ?? 1
              const fontSize1D =
                valueLen > charsAtMaxFont ? Math.max(6, code.position.width / (valueLen * 0.6)) : maxFontForHeight

              const highlightPosition = getHighlightPosition(code.position)
              const showDebugRawBox = enableScanZones && Platform.OS === 'android'

              return (
                <Animated.View
                  key={`${code.type}-${code.value}`}
                  style={[
                    styles.barcodeHighlight,
                    highlightStyle,
                    {
                      left: highlightPosition.x,
                      top: highlightPosition.y,
                      width: highlightPosition.width,
                      height: highlightPosition.height,
                      opacity: highlightFadeAnim,
                      justifyContent: 'center',
                      alignItems: 'center',
                      overflow: 'hidden',
                    },
                  ]}
                >
                  {showDebugRawBox && (
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        left: highlightPosition.x - code.position.x,
                        top: highlightPosition.y - code.position.y,
                        width: code.position.width,
                        height: code.position.height,
                        borderWidth: 1,
                        borderColor: '#FF00FF',
                        borderStyle: 'dashed',
                      }}
                    />
                  )}
                  {show1DValue && (
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.5}
                      style={{
                        color: '#FFFFFF',
                        fontSize: fontSize1D,
                        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        textShadowColor: 'rgba(0,0,0,0.8)',
                        textShadowOffset: { width: 1, height: 1 },
                        textShadowRadius: 2,
                        paddingHorizontal: 2,
                      }}
                    >
                      {code.value}
                    </Text>
                  )}
                </Animated.View>
              )
            })}

          {/* Focus indicator - rendered inside camera view for correct positioning */}
          {focusPoint && (
            <Animated.View
              style={[
                styles.focusIndicator,
                {
                  left: focusPoint.x - 40,
                  top: focusPoint.y - 40,
                  opacity: focusOpacity,
                  transform: [{ scale: focusScale }],
                },
              ]}
            />
          )}
        </View>
      </View>

      {/* Pinch-to-zoom + tap-to-focus gesture layer */}
      <GestureDetector gesture={composedGesture}>
        <Reanimated.View style={StyleSheet.absoluteFill} collapsable={false} />
      </GestureDetector>

      {/* Scan area guide — custom zones or default centered zone */}
      <View style={styles.overlayContainer} pointerEvents="none" testID="scan-zone">
        {scanZones && scanZones.length > 0 && containerSize ? (
          // Render custom scan zones from saved coordinates
          scanZones.map((zone) => {
            let zoneColor
            if (scanState === 'locked') {
              zoneColor = '#00FF00'
            } else if (scanState === 'aligned') {
              zoneColor = '#00CC00'
            } else {
              zoneColor = ColorPalette.brand.primary
            }
            return (
              <View
                key={`scan-zone-${zone.types.join('-')}-${zone.box.x}-${zone.box.y}`}
                style={{
                  position: 'absolute',
                  left: zone.box.x * containerSize.width,
                  top: zone.box.y * containerSize.height,
                  width: zone.box.width * containerSize.width,
                  height: zone.box.height * containerSize.height,
                  borderRadius: 4,
                  borderColor: zoneColor,
                  borderWidth: 4,
                  borderStyle: 'solid',
                }}
              />
            )
          })
        ) : (
          // Default centered scan zone
          <View
            style={styles.overlayOpening}
            onLayout={(event) => {
              const { x, y, width, height } = event.nativeEvent.layout
              setScanZoneBounds({ x, y, width, height })
              logger.debug('Scan zone bounds', { x, y, width, height })
            }}
          />
        )}
      </View>

      {/* Locked state action buttons — scanning is paused, user must confirm */}
      {scanState === 'locked' && (ENABLE_MANUAL_CONFIRM || enableScanZones) && (
        <View style={styles.lockedButtonsContainer}>
          {enableScanZones ? (
            <>
              <Pressable style={styles.saveButton} onPress={handleSaveScanZones} testID="save-scan-zones-button">
                <Text style={styles.saveButtonText}>{'\uD83D\uDCD0'} Save Scan Zones</Text>
              </Pressable>
              <Pressable
                style={styles.continueButton}
                onPress={handleContinueScanning}
                testID="continue-scanning-button"
              >
                <Text style={styles.continueButtonText}>{'\u25B6'} Continue Scanning</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable style={styles.confirmButton} onPress={handleConfirmScan} testID="confirm-scan-button">
                <Text style={styles.confirmButtonText}>{'\u2714'} Confirm</Text>
              </Pressable>
              <Pressable style={styles.continueButton} onPress={handleContinueScanning} testID="try-again-button">
                <Text style={styles.continueButtonText}>{'\uD83D\uDD04'} Try Again</Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      {/* Zoom level indicator - always visible */}
      <View style={styles.zoomIndicator}>
        <Text style={styles.zoomText}>Zoom: {zoomDisplay.toFixed(2)}x</Text>
        {device && (
          <Text style={[styles.zoomText, { fontSize: 8 }]}>
            ({device.minZoom?.toFixed(1)}-{device.maxZoom?.toFixed(1)})
          </Text>
        )}
      </View>

      {/* Torch toggle button */}
      <View style={styles.torchContainer}>
        <QRScannerTorch active={torchEnabled} onPress={toggleTorch} />
      </View>
    </View>
  )
}

export default CodeScanningCamera
