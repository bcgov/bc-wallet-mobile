import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { QRScannerTorch, TOKENS, useServices, useTheme } from '@bifold/core'
import { useFocusEffect, useIsFocused } from '@react-navigation/native'
import { a11yLabel } from '@utils/accessibility'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Reanimated, { Extrapolation, interpolate, runOnJS, useSharedValue } from 'react-native-reanimated'
import { Camera, CameraRef, useCameraDevice, useCameraPermission } from 'react-native-vision-camera'
import { BarcodeFormat, TargetBarcodeFormat, useBarcodeScannerOutput } from 'react-native-vision-camera-barcode-scanner'

import { ensureAppError } from '@/errors/errorHandler'
import { AppEventCode } from '@/events/appEventCode'
import { useBCSCActivity } from '../contexts/BCSCActivityContext'
import { isCameraControlCanceledError } from '../hooks/useVisionCamera'
import { isBackgroundedAppState } from '../utils/app-state'
import {
  AccumulatedCode,
  EnhancedCode,
  Rect,
  ScanState,
  ScanZone,
  ScannedCode,
  calculateBarcodeOrientation,
  clampZoom,
  determineScanState,
  getCameraMetadata,
  getPaddedHighlightPosition,
  isCodeAlignedWithZones,
  isRecoverableCameraRuntimeError,
  mergeLockedCodesWithAccumulated,
  toScannedCode,
} from './utils/camera'

export type { EnhancedCode, ScanZone }

/**
 * How far the pinch gesture scales to reach the full device zoom range.
 * A 3× pinch covers the entire min→max zoom range.
 */
const PINCH_SCALE_FULL_ZOOM = 3

/**
 * How long after a recoverable camera runtime error a repeat still counts as the same
 * failure. VisionCamera restarts the capture session itself after an iOS runtime error
 * and a failed restart posts another one immediately, so a repeat inside this window
 * means recovery did not work and the camera should fail over.
 */
const RECOVERABLE_ERROR_WINDOW_MS = 10_000

export interface CodeScanningCameraProps {
  /**
   * Callback function called when a code is successfully scanned.
   *
   * Return a Promise that if resolves to `false` signals that the
   * scanned codes were rejected (e.g. DL-only with no BCSC serial).  The
   * camera will automatically reset to the scanning state so the user can
   * try again.  Any other return value (including `void`) is treated as
   * accepted.
   *
   * @param codes Array of scanned codes with position and orientation metadata
   */
  onCodeScanned: (codes: EnhancedCode[]) => Promise<void | boolean>

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

  /**
   * Show the built-in visual scan-zone guide (the orange zone boxes / default
   * centered box). Alignment detection still uses `scanZones` regardless of this
   * flag — set to false when the parent renders its own framing overlay.
   * @default true
   */
  showScanZoneOverlay?: boolean

  /**
   * Show the live zoom-level indicator (dev/diagnostic readout).
   * @default true
   */
  showZoomIndicator?: boolean

  /**
   * Hide the built-in torch button so the parent can render its own.
   * @default false
   */
  hideTorchButton?: boolean

  /**
   * Controlled torch state. When provided, overrides the internal torch state
   * (use together with `onToggleTorch`).
   */
  torchActive?: boolean

  /**
   * Called when the torch is toggled. When provided, the component delegates
   * torch state to the parent instead of managing it internally.
   */
  onToggleTorch?: () => void

  /**
   * Called with whether the selected camera device has a torch, so a parent rendering
   * its own torch control (see `hideTorchButton`) can hide it on devices without one.
   * Fires on mount and again if the device changes.
   */
  onTorchAvailabilityChange?: (hasTorch: boolean) => void

  /**
   * Called whenever the collective scan state changes
   * (`scanning` → `aligned` → `locked`). Lets a parent rendering its own
   * framing overlay reflect alignment (e.g. recolour the outline).
   */
  onScanStateChange?: (state: ScanState) => void

  /**
   * Called when the camera hits a runtime error that isn't just the app being
   * backgrounded. Lets the parent fall back to a non-camera path.
   */
  onError?: (error: Error) => void
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
  showScanZoneOverlay = true,
  showZoomIndicator = true,
  hideTorchButton = false,
  torchActive,
  onToggleTorch,
  onTorchAvailabilityChange,
  onScanStateChange,
  onError,
}) => {
  // Derive scanner code types from the declared scan zones (deduped)
  const codeTypesKey = [...new Set(scanZones.flatMap((z) => z.types))].sort((a, b) => a.localeCompare(b)).join(',')
  // Keyed on content so a new `scanZones` array with the same types doesn't recreate the native scanner output
  const codeTypes = useMemo(
    () => (codeTypesKey ? codeTypesKey.split(',') : []) as TargetBarcodeFormat[],
    [codeTypesKey]
  )

  const { t } = useTranslation()
  const { ColorPalette, Spacing } = useTheme()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { emitErrorModal } = useErrorAlert()
  const { appStateStatus, pauseActivityTracking, resumeActivityTracking } = useBCSCActivity()
  const camera = useRef<CameraRef>(null)
  const [cameraStarted, setCameraStarted] = useState(false)
  const [torchEnabled, setTorchEnabled] = useState(false)
  // When `torchActive`/`onToggleTorch` are provided, the parent owns torch state.
  const isTorchOn = torchActive ?? torchEnabled
  const { width } = useWindowDimensions()
  const { hasPermission, requestPermission } = useCameraPermission()
  const isFocused = useIsFocused()
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null)
  const focusOpacity = useRef(new Animated.Value(0)).current
  const focusScale = useRef(new Animated.Value(1)).current

  const zoom = useSharedValue(initialZoom)
  const zoomOffset = useSharedValue(0)
  const [zoomDisplay, setZoomDisplay] = useState(initialZoom)

  // Barcode highlight state
  const [detectedCodes, setDetectedCodes] = useState<EnhancedCode[]>([])
  const highlightFadeAnim = useRef(new Animated.Value(0)).current

  const clearHighlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Prevents initialZoom from being reapplied on every screen re-focus or camera re-init
  const hasInitializedRef = useRef(false)

  // Track locked state inside scanner callback closure (React state is stale in callback)
  const isLockedRef = useRef(false)
  // Store locked codes for deferred callback when user taps "Continue"
  const lockedScanRef = useRef<{ codes: EnhancedCode[] } | null>(null)

  // --- Configurable highlight thresholds ---
  // Reading count required per code to reach "locked" state (green with border).
  // The count accumulates on each frame the code is detected and decays by
  // READING_DECAY_PER_MISSED_FRAME (not reset to 0) on a missed frame — see
  // decayStaleReadings — so it isn't strictly "consecutive" readings.
  const LOCK_READING_THRESHOLD = 5
  // Reading count decrement applied per frame a previously-seen code goes missing,
  // instead of resetting it to 0 — a single blank/missed frame (common on Android,
  // where ML Kit detection is intermittent) no longer wipes lock progress.
  const READING_DECAY_PER_MISSED_FRAME = 1
  // Alignment tolerance for scan zone matching (proportional to zone size)
  const ALIGNMENT_MARGIN_FACTOR = 0.05

  // Track consecutive readings for validation
  // iOS detects reliably at full resolution — use higher threshold for certainty
  // Android detects less frequently — lower threshold to reduce user frustration
  const barcodeReadings = useRef<Map<string, { value: string; type: BarcodeFormat; count: number }>>(new Map())
  const VALIDATION_THRESHOLD = Platform.OS === 'ios' ? 5 : 3

  // Collective scan state: 'scanning' → 'aligned' → 'locked'
  const [scanState, setScanState] = useState<ScanState>('scanning')

  // Surface scan-state changes so a parent can recolour its own framing overlay.
  useEffect(() => {
    onScanStateChange?.(scanState)
  }, [scanState, onScanStateChange])

  // Scan-and-accumulate: track validated codes across frames within a time window.
  // This allows PDF-417 and Code-39 to be detected in separate frames rather than
  // requiring both in the same frame — a huge improvement on Android where the lower
  // resolution and ML Kit processing make simultaneous detection unreliable.
  // Read by handleLockTransition (via mergeLockedCodesWithAccumulated) so that a lock
  // triggered by a single barcode (e.g. the code-39 serial alone satisfying the
  // single-zone BCSC_SN_SCAN_ZONES threshold) still carries along a different,
  // recently-validated barcode — e.g. the birthdate-bearing PDF-417 — instead of
  // silently dropping it (#4256/#4302).
  const accumulatedCodes = useRef<Map<string, AccumulatedCode>>(new Map())
  const ACCUMULATION_WINDOW_MS = Platform.OS === 'ios' ? 2000 : 3000

  // Track camera container dimensions for scan zone alignment
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null)

  // Track scan zone position for alignment detection
  const [scanZoneBounds, setScanZoneBounds] = useState<{
    x: number
    y: number
    width: number
    height: number
  } | null>(null)

  /**
   * Select the optimal camera device for barcode scanning
   * Prioritizes devices with better focus capabilities and macro support for dense PDF-417 codes
   */
  const device = useCameraDevice(cameraType, {
    physicalDevices: Platform.select({
      // On iOS, prefer telephoto for better zoom/focus on dense barcodes, then ultra-wide for focus control
      ios: ['telephoto', 'ultra-wide-angle', 'wide-angle'],
      // On Android, prefer wide-angle camera
      android: ['wide-angle'],
    }),
  })

  // Never ask the native camera for a torch the device doesn't have. VisionCamera throws
  // `device/flash-unavailable` (surfaced through onError) instead of ignoring it, and iPads
  // other than the Pro models have no flash at all — see MaskedCamera for the same guard.
  const hasTorch = device?.hasTorch ?? false

  useEffect(() => {
    onTorchAvailabilityChange?.(hasTorch)
  }, [hasTorch, onTorchAvailabilityChange])

  const cameraMetadata = useMemo(() => getCameraMetadata(device), [device])

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
      if (!device?.supportsFocusMetering || !camera.current) {
        return
      }
      drawFocusTap(point)
      try {
        await camera.current.focusTo(point)
      } catch (error) {
        // Focus can be cancelled by a newer focus request or a camera restart — not actionable
        logger.debug('Tap-to-focus error', { error: String(error) })
      }
    },
    [device?.supportsFocusMetering, drawFocusTap, logger]
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
  const enhanceSingleCode = (code: ScannedCode): EnhancedCode => {
    // v5 reports the box in full-resolution frame pixels, not screen points, and it isn't converted.
    // Only scan-zone alignment (focus-cycle priority) and the highlight overlay read it; scanning doesn't.
    const position: Rect = code.frame

    const corners = code.corners
    const orientation = calculateBarcodeOrientation(corners)

    // Check if code is aligned with scan zone (pass type for custom zone matching).
    // Alignment is metadata only now — it no longer gates validation/lock state (see
    // determineScanState); it still feeds focus-cycle prioritisation
    // (updateZoneDetectionTracking) and the EnhancedCode metadata consumed for the
    // purely-visual scan zone outline.
    const isAligned = position ? isCodeAlignedWithScanZone(position, code.type, ALIGNMENT_MARGIN_FACTOR) : false

    // Validate through consecutive readings
    const key = `${code.type}-${code.value}`
    let readingCount = 1
    let isValidated = false

    // Track readings for any code with a value — the same readingCount feeds two
    // independent thresholds: the visual "locked" state (readingCount >=
    // LOCK_READING_THRESHOLD, checked in determineScanState) and this code's
    // "validated" status for the scan callback below (readingCount >=
    // VALIDATION_THRESHOLD, which differs by platform). Position is not a gate: a
    // successfully decoded barcode counts regardless of where it sits on screen.
    // Card identity is validated downstream by decoding content (useCardScanner),
    // which rejects non-BCSC scans and resets the scanner.
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
      isValidated = readingCount >= VALIDATION_THRESHOLD
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

  /**
   * Decay (rather than immediately drop) readings for barcodes missing from the
   * current scan frame. Each missed frame reduces the reading count by
   * `READING_DECAY_PER_MISSED_FRAME`; the entry is only removed once it decays to
   * zero. This absorbs the ordinary single-frame misses that come from ML Kit
   * intermittency, screen glare, or momentary hand drift, instead of throwing away
   * all lock progress on the first blank frame.
   */
  const decayStaleReadings = (currentScanKeys: Set<string>) => {
    const keysToDelete: string[] = []
    barcodeReadings.current.forEach((reading, key) => {
      if (currentScanKeys.has(key)) {
        return
      }
      const decayedCount = reading.count - READING_DECAY_PER_MISSED_FRAME
      if (decayedCount <= 0) {
        keysToDelete.push(key)
      } else {
        barcodeReadings.current.set(key, { ...reading, count: decayedCount })
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

  /** Determine the collective scan state based on qualifying codes */
  const computeScanState = (
    enhancedCodes: EnhancedCode[]
  ): { newScanState: ScanState; qualifyingCodes: EnhancedCode[] } =>
    determineScanState(enhancedCodes, {
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

  /** Accumulate validated codes across frames within a time window */
  const accumulateValidatedResults = (enhancedCodes: EnhancedCode[]) => {
    const now = Date.now()
    const newlyValidated = enhancedCodes.filter((code) => code.isValidated)

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
  const handleLockTransition = (qualifyingCodes: EnhancedCode[], newScanState: ScanState) => {
    if (newScanState !== 'locked' || isLockedRef.current) {
      return
    }
    // Freeze scanning — user must tap "Confirm" or "Try Again"
    // newScanState === 'locked' already guarantees ≥minCodesForAligned qualifying codes this frame,
    // each with ≥LOCK_READING_THRESHOLD accumulated readings.
    // Merge in anything the accumulator is still holding (e.g. a PDF-417 validated a
    // moment ago but not present in this exact frame) so a lock driven by a single
    // barcode — e.g. the code-39 serial alone satisfying the single-zone threshold —
    // doesn't drop a different, already-read barcode (#4256/#4302). This frame's own
    // validated codes were just added to the accumulator by accumulateValidatedResults
    // above, so mergeLockedCodesWithAccumulated dedupes them back out and only the
    // genuinely-missing extras get merged in. Eligibility there is time-scoped, not
    // card-identity-scoped — see mergeLockedCodesWithAccumulated's JSDoc for the
    // accepted, self-correcting mid-scan card-swap edge case.
    isLockedRef.current = true
    lockedScanRef.current = {
      codes: mergeLockedCodesWithAccumulated(qualifyingCodes, accumulatedCodes.current, ACCUMULATION_WINDOW_MS),
    }
    // Cancel any clear timeout so highlights persist
    if (clearHighlightTimeoutRef.current) {
      clearTimeout(clearHighlightTimeoutRef.current)
      clearHighlightTimeoutRef.current = null
    }
  }

  /**
   * Handle a frame where no codes are detected — decay (don't reset) validation
   * readings, and clear highlights / drop back to 'scanning' once readings have
   * fully decayed to empty. This keeps a single blank frame from resetting lock
   * progress or flickering the outline back to its unread colour.
   */
  const handleNoCodesDetected = () => {
    if (isLockedRef.current) {
      return
    }
    // No codes present this frame — decay every tracked reading by one frame's worth.
    decayStaleReadings(new Set())

    if (barcodeReadings.current.size > 0) {
      // Still have partially-decayed readings — hold the current scan state/highlights.
      return
    }

    // Fully decayed — clear highlights and validation state
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
  }

  // Event-driven gate for the idle-nudge tick below: doFocus() only actually calls
  // camera.focus() once this many ms have passed with nothing decoded, so the
  // fixed-interval timer never refocuses mid-read and resets validation progress
  // (see doFocus inside startFocusCycling below). The tick resumes issuing real
  // focus() calls automatically once detections stop for this long. Cross-platform —
  // not gated to one OS.
  const FOCUS_SUPPRESS_AFTER_DETECTION_MS = 2000
  const lastDetectionAtRef = useRef(0)

  /**
   * Enhanced code scanner with position and orientation metadata
   * Pauses scanning while processing detected codes to prevent multiple callbacks
   * Requires at least 2 codes to proceed (barcode + license or combo card detection)
   *
   * `outputResolution: 'full'` scans at the sensor's full resolution — dense PDF-417 codes need
   * more than the preview-sized frames give (ML Kit recommends >=1156px width).
   */
  const scannerOutput = useBarcodeScannerOutput({
    barcodeFormats: codeTypes,
    outputResolution: 'full',
    onBarcodeScanned: (barcodes) => {
      // When locked, completely pause scanning — highlights are frozen on screen
      if (isLockedRef.current) {
        return
      }

      if (barcodes.length === 0) {
        handleNoCodesDetected()
        return
      }

      // Codes are actively being detected — hold off auto-refocus cycling
      lastDetectionAtRef.current = Date.now()

      // Enhance codes with position and orientation metadata
      const enhancedCodes = barcodes.map((barcode) => enhanceSingleCode(toScannedCode(barcode)))
      const currentScanKeys = new Set(enhancedCodes.map((c) => `${c.type}-${c.value}`))
      decayStaleReadings(currentScanKeys)
      updateZoneDetectionTracking(enhancedCodes)
      const { newScanState, qualifyingCodes } = computeScanState(enhancedCodes)
      setScanState(newScanState)
      updateBarcodeHighlights(enhancedCodes, newScanState)
      accumulateValidatedResults(enhancedCodes)
      handleLockTransition(qualifyingCodes, newScanState)
    },
    onError: (error) => {
      logger.error('[CodeScanningCamera] Error scanning barcode', error)
    },
  })

  useEffect(() => {
    if (!hasPermission) {
      requestPermission()
    }

    // Cleanup timeout on unmount
    return () => {
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

  // Auto-focus cycling: an idle-nudge tick, not a blind periodic refocus. It runs on
  // a fixed interval, but each tick is a no-op unless FOCUS_SUPPRESS_AFTER_DETECTION_MS
  // has elapsed since the last decode (see doFocus below) — so in practice it only
  // fires when nothing has been read for a while, e.g. after a tilt or hand movement
  // knocks focus off a scan zone. Runs continuously (start/stop is keyed off screen
  // focus and mount, not scanState) rather than being restarted on every scan-state
  // flip — see the effect below.
  const focusCycleIndex = useRef(0)
  const focusCycleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const FOCUS_CYCLE_INTERVAL_MS = 2500 // Idle-nudge tick interval

  const startFocusCycling = useCallback(() => {
    if (scanZones.length === 0 || !containerSize || !device?.supportsFocusMetering) {
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

      // Skip this cycle while a code is actively being read — refocusing mid-read
      // blurs the frame and resets validation progress. Cycling resumes
      // automatically once detections stop for FOCUS_SUPPRESS_AFTER_DETECTION_MS.
      if (Date.now() - lastDetectionAtRef.current < FOCUS_SUPPRESS_AFTER_DETECTION_MS) {
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

      camera.current.focusTo({ x: focusX, y: focusY }).catch((err) => {
        // Focus errors (canceled, not supported, etc.) are not actionable — log and move on
        logger.debug('Auto-focus cycle error', {
          zone: zoneIndex,
          undetected: undetectedIndices,
          error: String(err),
        })
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

  // scanState is deliberately NOT a dependency: restarting the cycle on every
  // scanning↔aligned flip fired startFocusCycling's immediate doFocus() each
  // time (#4300 focus storm). doFocus self-guards on isLockedRef and the
  // post-detection suppression window, so the timer can run continuously.
  useEffect(() => {
    startFocusCycling()
    return stopFocusCycling
  }, [startFocusCycling, stopFocusCycling])

  /**
   * LIFECYCLE MANAGEMENT per react-native-vision-camera best practices:
   * https://github.com/mrousavy/react-native-vision-camera/tree/main/docs/content/docs/lifecycle.mdx
   *
   * When screen focus changes, manage activity tracking and torch state.
   */
  useFocusEffect(
    useCallback(() => {
      // Screen gained focus - pause inactivity timeout while camera is active
      pauseActivityTracking()
      // Restart cycling explicitly on refocus. Previously this happened incidentally
      // via scanState-driven effect restarts; now that the cycling effect no longer
      // depends on scanState (see the effect above), the restart must be explicit here.
      // startFocusCycling() clears any existing timer first, so this is idempotent.
      startFocusCycling()

      return () => {
        // Screen lost focus - reset camera state and resume inactivity tracking
        setTorchEnabled(false)
        stopFocusCycling()
        resumeActivityTracking()
      }
    }, [pauseActivityTracking, startFocusCycling, stopFocusCycling, resumeActivityTracking])
  )

  // Diagnostic: log whenever screen focus or app foreground/background state
  // changes, since both drive the camera's `isActive` prop below. VisionCamera
  // tears down the session on deactivate and re-initializes cleanly on
  // reactivate, so backgrounding the app (or switching camera apps) while
  // scanning no longer leaves a dead camera. Fuller camera-setup diagnostic
  // logging is a follow-up.
  useEffect(() => {
    logger.info('CodeScanningCamera active state', { isFocused, appStateStatus })
  }, [isFocused, appStateStatus, logger])

  /**
   * Component unmount cleanup - ensure all resources are released.
   * This cleanup fires when the component fully unmounts (not just loses focus).
   * Per react-native-vision-camera docs, we reset state to avoid conflicts on remount.
   */
  useEffect(() => {
    const barcodeReadingsRef = barcodeReadings.current
    const accumulatedCodesRef = accumulatedCodes.current

    return () => {
      // Reset all refs to clean state when component unmounts to avoid stale state
      isLockedRef.current = false
      lockedScanRef.current = null
      barcodeReadingsRef.clear()
      accumulatedCodesRef.clear()
      detectedZoneIndices.current = new Set()

      // Clear any pending animation timeouts to prevent memory leaks
      if (clearHighlightTimeoutRef.current) {
        clearTimeout(clearHighlightTimeoutRef.current)
        clearHighlightTimeoutRef.current = null
      }
      if (focusCycleTimerRef.current) {
        clearInterval(focusCycleTimerRef.current)
        focusCycleTimerRef.current = null
      }

      logger.debug('CodeScanningCamera unmounted - all refs and timers cleaned')
    }
  }, [logger])

  const toggleTorch = () => {
    if (onToggleTorch) {
      onToggleTorch()
      return
    }
    setTorchEnabled((prev) => !prev)
  }

  const getCameraError = useCallback(
    (error: unknown) => {
      const appError = ensureAppError(error, AppEventCode.ADD_CARD_CAMERA_BROKEN)

      // Add camera device and format info to the error context for better debugging
      appError.addContext(cameraMetadata)

      return appError
    },
    [cameraMetadata]
  )

  /**
   * Handler for the camera session starting
   * Sets the zoom level once the camera is fully started and ready
   */
  const handleCameraStarted = useCallback(() => {
    logger.debug('Camera started', cameraMetadata)
    setCameraStarted(true)

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true
      const targetZoom = getEffectiveZoom(initialZoom ?? 1)
      zoom.value = targetZoom
      setZoomDisplay(targetZoom)
      logger.debug('Zoom applied after initialization', { zoom: targetZoom })
    }
  }, [logger, cameraMetadata, getEffectiveZoom, initialZoom, zoom])

  const handleCameraStopped = useCallback(() => setCameraStarted(false), [])

  // When the last recoverable runtime error (see isRecoverableCameraRuntimeError) arrived,
  // so a repeat inside RECOVERABLE_ERROR_WINDOW_MS is escalated instead of waited out again.
  const lastRecoverableErrorAtRef = useRef<number | null>(null)

  const handleCameraError = useCallback(
    (error: Error) => {
      if (isCameraControlCanceledError(error)) {
        logger.debug('[CodeScanningCamera] Ignoring canceled camera-control call', { message: error.message })
        return
      }

      if (isBackgroundedAppState(appStateStatus)) {
        // Ignore camera errors while backgrounded or transitioning (app switcher, notification
        // shade, incoming call on iOS) — they are expected and not actionable.
        logger.info('[CodeScanningCamera] Camera error ignored while app is backgrounded or inactive', {
          appStateStatus,
        })
        return
      }

      const appError = getCameraError(error)

      if (isRecoverableCameraRuntimeError(error as { code?: string })) {
        const now = Date.now()
        const previousAt = lastRecoverableErrorAtRef.current
        lastRecoverableErrorAtRef.current = now

        if (previousAt === null || now - previousAt > RECOVERABLE_ERROR_WINDOW_MS) {
          // VisionCamera restarts the capture session itself after an iOS runtime error, so a
          // single one is not a dead camera — failing over here would unmount a camera that is
          // about to come back. A failed restart posts another runtime error right away, which
          // lands inside the window and falls through to the fatal path below.
          logger.warn(
            '[CodeScanningCamera] recoverable runtime error, waiting for the camera session to restart',
            appError.toJSON()
          )
          return
        }
      }

      logger.error('[CodeScanningCamera] runtime error', appError.toJSON())
      emitErrorModal(t('BCSC.CameraDisclosure.Error'), t('BCSC.CameraDisclosure.ErrorMessage'), appError)
      onError?.(error)
    },
    [appStateStatus, emitErrorModal, t, getCameraError, onError, logger]
  )

  const handleSaveScanZones = useCallback(() => {
    if (!containerSize) {
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
  }, [detectedCodes, containerSize, logger])

  const resetScanningState = useCallback(() => {
    isLockedRef.current = false
    lockedScanRef.current = null
    setScanState('scanning')
    barcodeReadings.current.clear()
    accumulatedCodes.current.clear()
    setDetectedCodes([])

    // Clean up any pending timeouts
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
   *  The parent is expected to navigate away; if it doesn't, the user can tap "Try Again".
   *  If the callback returns `false`, reset the scanner so the user can retry. */
  const confirmScan = useCallback(async () => {
    const locked = lockedScanRef.current
    if (locked) {
      try {
        const result = await onCodeScanned(locked.codes)
        if (result === false) {
          resetScanningState()
        }
      } catch (error) {
        logger.error('Error in onCodeScanned callback', { error })
        resetScanningState()
      }
    }
  }, [onCodeScanned, resetScanningState, logger])

  // Auto-confirm: when manual confirm is disabled, immediately fire the callback on lock.
  // If the callback returns `false`, the scan was rejected — reset so the user can retry.
  useEffect(() => {
    if (!ENABLE_MANUAL_CONFIRM && scanState === 'locked') {
      confirmScan()
    }
  }, [scanState, confirmScan])

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
      // Shows behind the overlay until the first camera frame arrives (~1s on iOS), as MaskedCamera does
      backgroundColor: 'black',
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
        testID="camera-preview-container"
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
        <Camera
          ref={camera}
          style={styles.camera}
          device={device}
          isActive={isFocused && !isBackgroundedAppState(appStateStatus)}
          outputs={[scannerOutput]}
          constraints={[{ fps: 30 }]}
          // Before the session starts, Android rejects setZoom ("Camera is not active"); getInitialZoom covers startup.
          zoom={cameraStarted ? zoomDisplay : undefined}
          getInitialZoom={() => getEffectiveZoom(initialZoom)}
          // Never ask the camera for a torch before the session has started (Android drops it) or on
          // a device without one.
          torchMode={hasTorch && cameraStarted ? (isTorchOn ? 'on' : 'off') : undefined}
          onStarted={handleCameraStarted}
          onStopped={handleCameraStopped}
          onError={handleCameraError}
          resizeMode="cover"
        />

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
      {showScanZoneOverlay && (
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
      )}

      {/* Locked state action buttons — scanning is paused, user must confirm */}
      {scanState === 'locked' && (ENABLE_MANUAL_CONFIRM || enableScanZones) && (
        <View style={styles.lockedButtonsContainer}>
          {enableScanZones ? (
            <>
              <Pressable
                style={styles.saveButton}
                onPress={handleSaveScanZones}
                testID="save-scan-zones-button"
                accessibilityLabel={a11yLabel(t('BCSC.Scan.SaveScanZones'))}
                accessibilityRole="button"
              >
                <Text style={styles.saveButtonText}>{'\uD83D\uDCD0'} Save Scan Zones</Text>
              </Pressable>
              <Pressable
                style={styles.continueButton}
                onPress={handleContinueScanning}
                testID="continue-scanning-button"
                accessibilityLabel={a11yLabel(t('BCSC.Scan.ContinueScanning'))}
                accessibilityRole="button"
              >
                <Text style={styles.continueButtonText}>{'\u25B6'} Continue Scanning</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                style={styles.confirmButton}
                onPress={confirmScan}
                testID="confirm-scan-button"
                accessibilityLabel={a11yLabel(t('BCSC.Scan.Confirm'))}
                accessibilityRole="button"
              >
                <Text style={styles.confirmButtonText}>{'\u2714'} Confirm</Text>
              </Pressable>
              <Pressable
                style={styles.continueButton}
                onPress={handleContinueScanning}
                testID="try-again-button"
                accessibilityLabel={a11yLabel(t('BCSC.Scan.TryAgain'))}
                accessibilityRole="button"
              >
                <Text style={styles.continueButtonText}>{'\uD83D\uDD04'} Try Again</Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      {/* Zoom level indicator - diagnostic readout */}
      {showZoomIndicator && (
        <View style={styles.zoomIndicator}>
          <Text style={styles.zoomText}>Zoom: {zoomDisplay.toFixed(2)}x</Text>
          {device && (
            <Text style={[styles.zoomText, { fontSize: 8 }]}>
              ({device.minZoom?.toFixed(1)}-{device.maxZoom?.toFixed(1)})
            </Text>
          )}
        </View>
      )}

      {/* Torch toggle button — only on devices that actually have one */}
      {!hideTorchButton && hasTorch && (
        <View style={styles.torchContainer}>
          <QRScannerTorch active={isTorchOn} onPress={toggleTorch} />
        </View>
      )}
    </View>
  )
}

export default CodeScanningCamera
