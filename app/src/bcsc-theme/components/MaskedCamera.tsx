import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { ensureAppError } from '@/errors/errorHandler'
import { AppEventCode } from '@/events/appEventCode'
import { TestIds } from '@/test-ids/registry'
import {
  MaskType,
  SVGOverlay,
  testIdWithKey,
  ThemedText,
  TOKENS,
  usePreventDoublePress,
  useServices,
  useTheme,
} from '@bifold/core'
import { NavigationProp, ParamListBase, useIsFocused } from '@react-navigation/native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { Camera, CameraOutput, CameraPhotoOutput, MirrorMode } from 'react-native-vision-camera'
import { useBCSCActivity } from '../contexts/BCSCActivityContext'
import { useCameraInterruption, useCameraNotReadyTimeout, useRecoverableCameraError } from '../hooks/useCameraRecovery'
import { isCameraControlCanceledError, useVisionCamera } from '../hooks/useVisionCamera'
import { isBackgroundedAppState } from '../utils/app-state'
import CameraInterruptedOverlay from './CameraInterruptedOverlay'
import { getCameraMetadata, isCameraNotReadyCaptureError } from './utils/camera'

type MaskedCameraProps = {
  navigation: NavigationProp<ParamListBase>
  photoOutput: CameraPhotoOutput
  cameraFace: 'front' | 'back'
  cameraInstructions?: string
  cameraLabel?: string
  maskType?: MaskType
  maskLineColor?: string
  maskLineWidth?: number
  maskOverlayOpacity?: number
  customPath?: string
  codeScanner?: CameraOutput
  onPhotoTaken: (path: string) => void
}

const MaskedCamera = ({
  navigation,
  photoOutput,
  cameraInstructions,
  cameraLabel,
  maskLineColor,
  maskLineWidth,
  maskOverlayOpacity = 0,
  maskType,
  customPath,
  codeScanner,
  cameraFace = 'back',
  onPhotoTaken,
}: MaskedCameraProps) => {
  const { t } = useTranslation()
  const safeAreaInsets = useSafeAreaInsets()
  const { Spacing, ColorPalette } = useTheme()
  const [torchEnabled, setTorchEnabled] = useState(false)
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
      position: 'relative',
    },
    camera: {
      flex: 1,
    },
    controlsContainer: {
      flex: 1,
      position: 'absolute',
      bottom: 30,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      marginBottom: safeAreaInsets.bottom,
    },
    instructionText: {
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      position: 'absolute',
      fontWeight: 'normal',
      left: 0,
      right: 0,
      zIndex: 5,
      padding: Spacing.lg,
      flex: 1,
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

  return (
    <View style={{ flex: 1, backgroundColor: 'black', position: 'relative' }}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        device={device}
        mirrorMode={mirrorMode}
        isActive={isFocused && !isBackgroundedAppState(appStateStatus)}
        onError={onError}
        outputs={[photoOutput, codeScanner].filter(Boolean) as CameraOutput[]}
        torchMode={torchMode}
        onConfigured={() => logger.debug('MaskedCamera initialized', cameraMetadata)}
        onStarted={() => {
          setCameraStarted(true)
          clearInterruption()
          setShowNotReadyNotice(false)
        }}
        onStopped={() => setCameraStarted(false)}
        onInterruptionStarted={onInterruptionStarted}
        onInterruptionEnded={onInterruptionEnded}
      />
      {maskType && (
        <SVGOverlay
          maskType={maskType}
          customPath={customPath}
          strokeColor={maskLineColor ?? ColorPalette.brand.tertiary}
          strokeWidth={maskLineWidth}
          overlayOpacity={maskOverlayOpacity}
        />
      )}
      {isInterrupted && <CameraInterruptedOverlay />}
      <View style={styles.instructionText}>
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
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={handleCancel}
          accessibilityLabel={t('BCSC.CameraDisclosure.CancelCamera')}
          accessibilityRole="button"
          testID={testIdWithKey(TestIds.shared.maskedCamera.cancel)}
        >
          <ThemedText style={{ color: ColorPalette.grayscale.white }}>{t('Global.Cancel')}</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.captureButton, !isCameraReady && { opacity: 0.4 }]}
          onPress={preventDoublePress(takeAndSavePhoto)}
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
