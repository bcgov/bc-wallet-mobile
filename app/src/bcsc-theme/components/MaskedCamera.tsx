import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { ensureAppError } from '@/errors/errorHandler'
import { AppEventCode } from '@/events/appEventCode'
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
import { useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { Camera, CameraOutput, CommonResolutions } from 'react-native-vision-camera'
import { useBCSCActivity } from '../contexts/BCSCActivityContext'
import { useVisionCamera } from '../hooks/useVisionCamera'
import { isBackgroundedAppState } from '../utils/app-state'
import { getCameraMetadata } from './utils/camera'

type MaskedCameraProps = {
  navigation: NavigationProp<ParamListBase>
  cameraFace: 'front' | 'back'
  cameraInstructions?: string
  cameraLabel?: string
  maskType?: MaskType
  maskLineColor?: string
  maskLineWidth?: number
  maskOverlayOpacity?: number
  customPath?: string
  codeScanner?: CameraOutput
  photoQualityBalance?: 'speed' | 'balanced' | 'quality'
  onPhotoTaken: (path: string) => void
}

const MaskedCamera = ({
  navigation,
  cameraInstructions,
  cameraLabel,
  maskLineColor,
  maskLineWidth,
  maskOverlayOpacity = 0,
  maskType,
  customPath,
  codeScanner,
  photoQualityBalance = 'speed',
  cameraFace = 'back',
  onPhotoTaken,
}: MaskedCameraProps) => {
  const { cameraRef, device, takePhoto, hasTorch, isTorchOn, enableTorch, photoOutput } = useVisionCamera({
    position: cameraFace,
    qualityPrioritization: photoQualityBalance,
    targetPhotoResolution: CommonResolutions.FHD_16_9, // 1080p
  })
  // const device = useCameraDevice(cameraFace)
  const { t } = useTranslation()
  const safeAreaInsets = useSafeAreaInsets()
  const { Spacing, ColorPalette } = useTheme()
  // const [torchOn, setTorchOn] = useState(false)
  // const cameraRef = useRef<CameraRef>(null)
  // const controller = cameraRef.current?.controller
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const isFocused = useIsFocused()
  // const format = useCameraFormat(device, cameraFormatFilter)
  // const { failedToWriteToLocalStorageAlert } = useAlerts(navigation)
  const { emitErrorModal } = useErrorAlert()
  const { preventDoublePress } = usePreventDoublePress()
  const { appStateStatus } = useBCSCActivity()
  //const hasTorch = device?.hasTorch ?? false

  // const photoOutput = usePhotoOutput({
  //   quality: 0.9,
  //   qualityPrioritization: photoQualityBalance,
  //   targetResolution: CommonResolutions.FHD_16_9, // 1080p
  // })
  // TODO (MD VisionCamera): Replace with actual metadata
  const cameraMetadata = useMemo(() => getCameraMetadata(device), [device])

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

  // const handleTorchChange = useCallback(
  //   (newTorchMode: 'on' | 'off') => {
  //     setTorchOn(newTorchMode === 'on')
  //     controller?.setTorchMode(newTorchMode)
  //   },
  //   [controller]
  // )

  // const toggleTorch = () => {
  //   handleTorchChange(torchOn ? 'off' : 'on')
  // }

  useEffect(() => {
    if (!device) {
      // provide back button if they have no working camera
      navigation.setOptions({
        headerShown: true,
      })
    }
  }, [device, navigation])

  // useEffect(() => {
  //   if (!isFocused) {
  //     handleTorchChange('off')
  //   }
  // }, [handleTorchChange, isFocused])

  // const emitCameraError = useCallback(
  //   (error: unknown) => {
  //     const appError = ensureAppError(error, AppEventCode.ADD_CARD_CAMERA_BROKEN)
  //
  //     // Add camera device and format info to the error context for better debugging
  //     appError.addContext(cameraMetadata)
  //
  //     logger.error('[MaskedCamera] runtime error', appError.toJSON())
  //
  //     emitErrorModal(t('BCSC.CameraDisclosure.Error'), t('BCSC.CameraDisclosure.ErrorMessage'), appError)
  //   },
  //   [cameraMetadata, emitErrorModal, logger, t]
  // )

  const onError = useCallback(
    (error: unknown) => {
      if (isBackgroundedAppState(appStateStatus)) {
        // Ignore camera errors while backgrounded or transitioning (app switcher, notification
        // shade, incoming call on iOS) — they are expected and not actionable.
        logger.info('[MaskedCamera] Camera error ignored while app is backgrounded or inactive', { appStateStatus })
        return
      }

      const appError = ensureAppError(error, AppEventCode.ADD_CARD_CAMERA_BROKEN)

      // Add camera device and format info to the error context for better debugging
      appError.addContext(cameraMetadata)

      emitErrorModal(t('BCSC.CameraDisclosure.Error'), t('BCSC.CameraDisclosure.ErrorMessage'), appError)
    },
    [appStateStatus, cameraMetadata, emitErrorModal, logger, t]
  )
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
    if (!cameraRef.current || !isFocused) {
      return
    }

    try {
      const photo = await takePhoto()
      onPhotoTaken(photo.filePath)
      logger.info(`[MaskedCamera] Photo taken and saved temporarily: ${photo.filePath}`)
    } catch (error) {
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
        // TODO (MD VisionCamera): Audit these commented props
        // format={format}
        isActive={isFocused && !isBackgroundedAppState(appStateStatus)}
        // photo={true}
        // video={true}
        // photoQualityBalance={photoQualityBalance}
        // isMirrored={false}
        // onInitialized={() => logger.debug('MaskedCamera initialized', cameraMetadata)}
        onError={onError}
        // codeScanner={codeScanner}
        // torch={torchOn ? 'on' : 'off'}
        // Set fps to max supported by the selected format for smoother preview
        // fps={format?.maxFps}
        outputs={[photoOutput, codeScanner].filter(Boolean) as CameraOutput[]}
        onConfigured={() => logger.debug('MaskedCamera initialized', cameraMetadata)}
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
      </View>
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={handleCancel}
          accessibilityLabel={t('BCSC.CameraDisclosure.CancelCamera')}
          accessibilityRole="button"
          testID={testIdWithKey('CancelCamera')}
        >
          <ThemedText style={{ color: ColorPalette.grayscale.white }}>{t('Global.Cancel')}</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.captureButton}
          onPress={preventDoublePress(takeAndSavePhoto)}
          accessibilityLabel={t('BCSC.CameraDisclosure.TakePhoto')}
          accessibilityRole="button"
          testID={testIdWithKey('TakePhoto')}
        ></TouchableOpacity>
        {hasTorch ? (
          <TouchableOpacity
            style={{ flex: 1, alignItems: 'flex-end' }}
            onPress={() => enableTorch(!isTorchOn)}
            accessibilityLabel={t('BCSC.CameraDisclosure.ToggleFlash')}
            accessibilityRole="button"
            testID={testIdWithKey('ToggleFlash')}
          >
            <Icon size={24} name={isTorchOn ? 'flash' : 'flash-off'} color={ColorPalette.grayscale.white} />
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }} />
        )}
      </View>
    </View>
  )
}

export default MaskedCamera
