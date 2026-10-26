import { hitSlop } from '@/constants'
import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { ensureAppError } from '@/errors/errorHandler'
import { AppEventCode } from '@/events/appEventCode'
import { TestIds } from '@/test-ids/registry'
import { MaskType, testIdWithKey, ThemedText, TOKENS, usePreventDoublePress, useServices, useTheme } from '@bifold/core'
import { NavigationProp, ParamListBase, useIsFocused } from '@react-navigation/native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LayoutChangeEvent, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Defs, Ellipse, Mask, Rect } from 'react-native-svg'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { Camera, CameraOutput, CameraPhotoOutput, MirrorMode } from 'react-native-vision-camera'
import { useBCSCActivity } from '../contexts/BCSCActivityContext'
// Note: uncomment the following lines to simulate camera errors
// import {
//   SIMULATE_CAMERA_EVENTS,
//   throwIfSimulatingNotReadyCapture,
//   useSimulatedMediaServicesResets,
// } from '../hooks/useCameraEventSimulation'
import { useCameraInterruption, useCameraNotReadyTimeout, useRecoverableCameraError } from '../hooks/useCameraRecovery'
import { isCameraControlCanceledError, useVisionCamera } from '../hooks/useVisionCamera'
import { isBackgroundedAppState } from '../utils/app-state'
import CameraInterruptedOverlay from './CameraInterruptedOverlay'
import { getCameraMetadata, isCameraNotReadyCaptureError } from './utils/camera'
import { PREVIEW_IMPLEMENTATION_MODE } from './utils/camera-output'

const controlHitSlop = { top: hitSlop.top, bottom: hitSlop.bottom }

type MaskedCameraProps = {
  navigation: NavigationProp<ParamListBase>
  photoOutput: CameraPhotoOutput
  cameraFace: 'front' | 'back'
  cameraInstructions?: string
  cameraLabel?: string
  /** Only the selfie oval is drawn; it is sized to the preview, not the window. */
  maskType?: MaskType.OVAL
  maskLineColor?: string
  maskLineWidth?: number
  maskOverlayOpacity?: number
  codeScanner?: CameraOutput
  onPhotoTaken: (path: string) => void
}

export type OvalGeometry = { cx: number; cy: number; rx: number; ry: number }

/**
 * Oval cutout for a camera preview of the given size. Matches bifold's `MaskType.OVAL` (radii of
 * 45% of the width and 28% of the window height) while the preview is tall enough, and shrinks to
 * keep `margin` of preview visible above and below the oval once the instruction and control bars
 * take more room, as they do at large OS font sizes (#4401). The width shrinks with the height so
 * the oval keeps a face-like proportion.
 */
export const getOvalGeometry = (width: number, height: number, windowHeight: number, margin: number): OvalGeometry => {
  const ry = Math.max(0, Math.min(height / 2 - margin, windowHeight * 0.28))
  const rx = Math.min(width * 0.45, ry * 0.82)

  return { cx: width / 2, cy: height / 2, rx, ry }
}

type OvalMaskOverlayProps = OvalGeometry & {
  width: number
  height: number
  strokeColor: string
  strokeWidth?: number
  overlayOpacity?: number
}

/** Dims the preview outside the oval and outlines it. Sized to the measured preview box. */
const OvalMaskOverlay = ({
  width,
  height,
  cx,
  cy,
  rx,
  ry,
  strokeColor,
  strokeWidth = 2,
  overlayOpacity = 0.6,
}: OvalMaskOverlayProps) => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    <Svg width={width} height={height}>
      <Defs>
        <Mask id="ovalMask">
          <Rect width={width} height={height} fill="white" />
          <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="black" />
        </Mask>
      </Defs>
      <Rect width={width} height={height} fill="black" fillOpacity={overlayOpacity} mask="url(#ovalMask)" />
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="transparent" stroke={strokeColor} strokeWidth={strokeWidth} />
    </Svg>
  </View>
)

const MaskedCamera = ({
  navigation,
  photoOutput,
  cameraInstructions,
  cameraLabel,
  maskLineColor,
  maskLineWidth,
  maskOverlayOpacity = 0,
  maskType,
  codeScanner,
  cameraFace = 'back',
  onPhotoTaken,
}: MaskedCameraProps) => {
  const { t } = useTranslation()
  const safeAreaInsets = useSafeAreaInsets()
  const window = useWindowDimensions()
  const { Spacing, ColorPalette } = useTheme()
  const [torchEnabled, setTorchEnabled] = useState(false)
  // The preview is the space left between the instruction and control bars; the window is only a
  // first-render stand-in until onLayout reports the real box.
  const [previewSize, setPreviewSize] = useState<{ width: number; height: number } | null>(null)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const isFocused = useIsFocused()
  const { emitErrorModal } = useErrorAlert()
  const { preventDoublePress } = usePreventDoublePress()
  const { appStateStatus } = useBCSCActivity()
  const [cameraStarted, setCameraStarted] = useState(false)
  const { isInterrupted, interruptionReason, onInterruptionStarted, onInterruptionEnded, clearInterruption } =
    useCameraInterruption('MaskedCamera')
  const shouldAwaitRecovery = useRecoverableCameraError()
  // Capturing while the session is stopped or interrupted fails (iOS -11803, Android "Camera is closed.")
  const isCameraReady = cameraStarted && !isInterrupted
  const [showNotReadyNotice, setShowNotReadyNotice] = useState(false)
  // A second "not ready" capture failure in a row is reported instead, so the user isn't stuck retrying
  const consecutiveNotReadyCapturesRef = useRef(0)

  const { cameraRef, device, takePhoto } = useVisionCamera({
    position: cameraFace,
    photoOutput,
  })

  // Mirrored front preview, un-mirrored saved photo so text reads correctly for ID Check (#4020).
  // Per-output mirrorMode comes from our react-native-vision-camera patch.
  const mirrorMode = useCallback(
    (output: CameraOutput): MirrorMode => (output === photoOutput ? 'off' : 'auto'),
    [photoOutput]
  )

  const cameraMetadata = useMemo(() => getCameraMetadata(device), [device])
  const hasTorch = device?.hasTorch ?? false

  const torchMode = useMemo(() => {
    if (!device?.hasTorch || !cameraStarted) {
      return undefined
    }

    if (!torchEnabled) {
      return 'off'
    }

    return 'on'
  }, [cameraStarted, device?.hasTorch, torchEnabled])

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPalette.grayscale.black,
    },
    // Text and controls sit above and below the preview rather than on it, so long text at large
    // OS font sizes shrinks the preview instead of covering it (#4401)
    preview: {
      flex: 1,
      overflow: 'hidden',
    },
    camera: {
      flex: 1,
    },
    controlsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.lg,
      paddingBottom: safeAreaInsets.bottom + Spacing.lg,
    },
    instructionContainer: {
      padding: Spacing.lg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    captureButton: {
      width: 70,
      height: 70,
      borderRadius: 35,
      borderColor: ColorPalette.grayscale.white,
      borderWidth: 4,
      justifyContent: 'center',
      alignItems: 'center',
    },
  })

  useEffect(() => {
    if (!isFocused) {
      setTorchEnabled(false)
    }
  }, [isFocused])

  useEffect(() => {
    navigation.setOptions({
      headerShown: !device,
    })
  }, [device, navigation])

  const onError = useCallback(
    (error: unknown) => {
      if (isBackgroundedAppState(appStateStatus)) {
        // Ignore camera errors while backgrounded or transitioning (app switcher, notification
        // shade, incoming call on iOS) — they are expected and not actionable.
        logger.info('[MaskedCamera] Camera error ignored while app is backgrounded or inactive', { appStateStatus })
        return
      }

      if (isCameraControlCanceledError(error)) {
        logger.debug('[MaskedCamera] Ignoring canceled camera-control call', { message: error.message })
        return
      }

      const appError = ensureAppError(error, AppEventCode.ADD_CARD_CAMERA_BROKEN)

      // Add camera device and format info to the error context for better debugging
      appError.addContext(cameraMetadata)

      if (shouldAwaitRecovery(error)) {
        logger.warn(
          '[MaskedCamera] recoverable runtime error, waiting for the camera session to restart',
          appError.toJSON()
        )
        return
      }

      emitErrorModal(t('BCSC.CameraDisclosure.Error'), t('BCSC.CameraDisclosure.ErrorMessage'), appError)
    },
    [appStateStatus, cameraMetadata, emitErrorModal, logger, shouldAwaitRecovery, t]
  )

  // Note: uncomment the following line to simulate camera errors
  // useSimulatedMediaServicesResets(onError)

  useCameraNotReadyTimeout({
    shouldBeRunning: Boolean(device) && isFocused && !isBackgroundedAppState(appStateStatus),
    isStarted: cameraStarted,
    interruptionReason,
    onTimeout: onError,
  })

  if (!device) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ThemedText>{t('BCSC.CameraDisclosure.NoCameraAvailable', { device: cameraFace })}</ThemedText>
        </View>
      </SafeAreaView>
    )
  }

  const handleCancel = () => {
    navigation.goBack()
  }

  const takeAndSavePhoto = async () => {
    if (!isFocused || !isCameraReady) {
      return
    }

    setShowNotReadyNotice(false)

    try {
      // Note: uncomment the following line to simulate camera errors
      // throwIfSimulatingNotReadyCapture()
      const photo = await takePhoto()
      consecutiveNotReadyCapturesRef.current = 0
      onPhotoTaken(photo.filePath)
      logger.info(`[MaskedCamera] Photo taken and saved temporarily: ${photo.filePath}`)
    } catch (error) {
      if (isCameraNotReadyCaptureError(error)) {
        consecutiveNotReadyCapturesRef.current += 1
      } else {
        consecutiveNotReadyCapturesRef.current = 0
      }

      if (consecutiveNotReadyCapturesRef.current === 1) {
        // The session stopped between the tap and the capture; the shutter re-enables once it runs again
        logger.warn('[MaskedCamera] Photo capture failed because the camera was not running', {
          message: (error as Error).message,
        })
        setShowNotReadyNotice(true)
        return
      }

      consecutiveNotReadyCapturesRef.current = 0

      logger.error('[MaskedCamera] Error taking photo', error as Error)
      onError(error)
    }
  }

  const onPreviewLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    setPreviewSize((current) => (current?.width === width && current?.height === height ? current : { width, height }))
  }

  const previewWidth = previewSize?.width ?? window.width
  const previewHeight = previewSize?.height ?? window.height
  const hasInstructions = Boolean(cameraLabel || cameraInstructions || showNotReadyNotice)

  return (
    <View style={styles.container}>
      {hasInstructions && (
        <View style={styles.instructionContainer}>
          {cameraLabel && (
            <ThemedText style={{ color: 'white', textAlign: 'center' }} variant={'headingFour'}>
              {cameraLabel}
            </ThemedText>
          )}
          {cameraInstructions && (
            <ThemedText
              style={{
                color: 'white',
                textAlign: 'center',
              }}
              variant={'headingFour'}
            >
              {cameraInstructions}
            </ThemedText>
          )}
          {showNotReadyNotice && (
            <ThemedText
              style={{ color: 'white', textAlign: 'center', marginTop: Spacing.sm }}
              accessibilityLiveRegion="polite"
              testID={testIdWithKey(TestIds.shared.maskedCamera.notReady)}
            >
              {t('BCSC.CameraDisclosure.CameraNotReady')}
            </ThemedText>
          )}
        </View>
      )}
      <View style={styles.preview} onLayout={onPreviewLayout}>
        <Camera
          ref={cameraRef}
          style={styles.camera}
          device={device}
          implementationMode={PREVIEW_IMPLEMENTATION_MODE}
          mirrorMode={mirrorMode}
          isActive={isFocused && !isBackgroundedAppState(appStateStatus)}
          onError={onError}
          outputs={[photoOutput, codeScanner].filter(Boolean) as CameraOutput[]}
          torchMode={torchMode}
          onConfigured={() => logger.debug('MaskedCamera initialized', cameraMetadata)}
          onStarted={() => {
            // Note: to simulate camera errors, replace `true` with `!SIMULATE_CAMERA_EVENTS.neverStarts`
            setCameraStarted(true)
            clearInterruption()
            setShowNotReadyNotice(false)
          }}
          onStopped={() => setCameraStarted(false)}
          onInterruptionStarted={onInterruptionStarted}
          onInterruptionEnded={onInterruptionEnded}
        />
        {maskType && (
          <OvalMaskOverlay
            width={previewWidth}
            height={previewHeight}
            {...getOvalGeometry(previewWidth, previewHeight, window.height, Spacing.lg)}
            strokeColor={maskLineColor ?? ColorPalette.brand.tertiary}
            strokeWidth={maskLineWidth}
            overlayOpacity={maskOverlayOpacity}
          />
        )}
        {isInterrupted && <CameraInterruptedOverlay />}
      </View>
      {/* Side by side, so the slop is vertical only: a horizontal one would steal taps from the shutter */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={handleCancel}
          hitSlop={controlHitSlop}
          accessibilityLabel={t('BCSC.CameraDisclosure.CancelCamera')}
          accessibilityRole="button"
          testID={testIdWithKey(TestIds.shared.maskedCamera.cancel)}
        >
          <ThemedText style={{ color: ColorPalette.grayscale.white }}>{t('Global.Cancel')}</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.captureButton, !isCameraReady && { opacity: 0.4 }]}
          onPress={preventDoublePress(takeAndSavePhoto)}
          hitSlop={controlHitSlop}
          disabled={!isCameraReady}
          accessibilityLabel={t('BCSC.CameraDisclosure.TakePhoto')}
          accessibilityRole="button"
          accessibilityState={{ disabled: !isCameraReady }}
          testID={testIdWithKey(TestIds.shared.maskedCamera.takePhoto)}
        ></TouchableOpacity>
        {hasTorch ? (
          <TouchableOpacity
            style={{ flex: 1, alignItems: 'flex-end' }}
            onPress={() => setTorchEnabled((prev) => !prev)}
            hitSlop={controlHitSlop}
            accessibilityLabel={t('BCSC.CameraDisclosure.ToggleFlash')}
            accessibilityRole="button"
            testID={testIdWithKey(TestIds.shared.maskedCamera.toggleFlash)}
          >
            <Icon size={24} name={torchEnabled ? 'flash' : 'flash-off'} color={ColorPalette.grayscale.white} />
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }} />
        )}
      </View>
    </View>
  )
}

export default MaskedCamera
