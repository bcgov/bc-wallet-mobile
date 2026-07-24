import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { ensureAppError } from '@/errors/errorHandler'
import { AppEventCode } from '@/events/appEventCode'
import { useAlerts } from '@/hooks/useAlerts'
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
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import {
  Camera,
  CameraCaptureError,
  CodeScanner,
  FormatFilter,
  useCameraDevice,
  useCameraFormat,
} from 'react-native-vision-camera'
import { useBCSCActivity } from '../contexts/BCSCActivityContext'
import { isBackgroundedAppState } from '../utils/app-state'

type MaskedCameraProps = {
  navigation: NavigationProp<ParamListBase>
  cameraFace: 'front' | 'back'
  cameraFormatFilter?: FormatFilter[]
  cameraInstructions?: string
  cameraLabel?: string
  maskType?: MaskType
  maskLineColor?: string
  maskLineWidth?: number
  maskOverlayOpacity?: number
  customPath?: string
  codeScanner?: CodeScanner
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
  cameraFormatFilter = [],
  onPhotoTaken,
}: MaskedCameraProps) => {
  const device = useCameraDevice(cameraFace)
  const { t } = useTranslation()
  const safeAreaInsets = useSafeAreaInsets()
  const { Spacing, ColorPalette } = useTheme()
  const [torchOn, setTorchOn] = useState(false)
  const cameraRef = useRef<Camera>(null)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const isFocused = useIsFocused()
  const format = useCameraFormat(device, cameraFormatFilter)
  const { failedToWriteToLocalStorageAlert } = useAlerts(navigation)
  const { emitErrorModal } = useErrorAlert()
  const { preventDoublePress } = usePreventDoublePress()
  const { appStateStatus } = useBCSCActivity()
  const hasTorch = device?.hasTorch ?? false

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

  const toggleTorch = () => setTorchOn((prev: boolean) => !prev)

  useEffect(() => {
    if (!device) {
      // provide back button if they have no working camera
      navigation.setOptions({
        headerShown: true,
      })
    }
  }, [device, navigation])

  useEffect(() => {
    if (!isFocused) {
      setTorchOn(false)
    }
  }, [isFocused])

  const getCameraError = useCallback(
    (error: unknown) => {
      logger.error('[MaskedCamera] runtime error', error as Error)

      const appError = ensureAppError(error, AppEventCode.ADD_CARD_CAMERA_BROKEN)

      // Add camera device and format info to the error context for better debugging
      appError.addContext({
        camera: {
          device,
          format,
        },
      })

      return appError
    },
    [device, format, logger]
  )

  const onError = useCallback(
    (error: unknown) => {
      if (isBackgroundedAppState(appStateStatus)) {
        // Ignore camera errors while backgrounded or transitioning (app switcher, notification
        // shade, incoming call on iOS) — they are expected and not actionable.
        logger.info('[MaskedCamera] Camera error ignored while app is backgrounded or inactive', { appStateStatus })
        return
      }

      emitErrorModal(t('BCSC.CameraDisclosure.Error'), t('BCSC.CameraDisclosure.ErrorMessage'), getCameraError(error))
    },
    [appStateStatus, getCameraError, emitErrorModal, t, logger]
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

  const takePhoto = async () => {
    try {
      if (cameraRef.current && isFocused) {
        const photo = await cameraRef.current.takePhoto({
          flash: 'off',
          enableShutterSound: false,
        })

        onPhotoTaken(photo.path)
        logger.info(`Photo taken and saved temporarily: ${photo.path}`)
      }
    } catch (error) {
      logger.error(`Error taking photo: ${error}`)

      // Handle file I/O errors separately to provide a specific alert
      if (error instanceof CameraCaptureError && error.code === 'capture/file-io-error') {
        failedToWriteToLocalStorageAlert(error)
        return
      }

      const appError = getCameraError(error)

      emitErrorModal(t('BCSC.CameraDisclosure.Error'), t('BCSC.CameraDisclosure.ErrorTakingPhoto'), appError)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'black', position: 'relative' }}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        device={device}
        format={format}
        isActive={isFocused && !isBackgroundedAppState(appStateStatus)}
        photo={true}
        video={true}
        photoQualityBalance={photoQualityBalance}
        isMirrored={false}
        onInitialized={() => logger.debug('MaskedCamera initialized', { device, format })}
        onError={onError}
        codeScanner={codeScanner}
        torch={torchOn ? 'on' : 'off'}
        // Set fps to max supported by the selected format for smoother preview
        fps={format?.maxFps}
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
          onPress={preventDoublePress(takePhoto)}
          accessibilityLabel={t('BCSC.CameraDisclosure.TakePhoto')}
          accessibilityRole="button"
          testID={testIdWithKey('TakePhoto')}
        ></TouchableOpacity>
        {hasTorch ? (
          <TouchableOpacity
            style={{ flex: 1, alignItems: 'flex-end' }}
            onPress={toggleTorch}
            accessibilityLabel={t('BCSC.CameraDisclosure.ToggleFlash')}
            accessibilityRole="button"
            testID={testIdWithKey('ToggleFlash')}
          >
            <Icon size={24} name={torchOn ? 'flash' : 'flash-off'} color={ColorPalette.grayscale.white} />
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }} />
        )}
      </View>
    </View>
  )
}

export default MaskedCamera
