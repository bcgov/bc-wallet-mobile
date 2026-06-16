import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { ensureAppError } from '@/errors/errorHandler'
import { AppEventCode } from '@/events/appEventCode'
import { useAlerts } from '@/hooks/useAlerts'
import { MaskType, SVGOverlay, testIdWithKey, ThemedText, TOKENS, useServices, useTheme } from '@bifold/core'
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

type MaskedCameraProps = {
  navigation: NavigationProp<ParamListBase>
  cameraFace: 'front' | 'back'
  cameraFormatFilter?: FormatFilter[]
  cameraInstructions?: string
  cameraLabel?: string
  maskType?: MaskType
  maskLineColor?: string
  codeScanner?: CodeScanner
  onPhotoTaken: (path: string) => void
}

const MaskedCamera = ({
  navigation,
  cameraInstructions,
  cameraLabel,
  maskLineColor,
  maskType,
  codeScanner,
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
      backgroundColor: 'transparent',
      position: 'absolute',
      fontWeight: 'normal',
      top: Spacing.md,
      left: 0,
      right: 0,
      zIndex: 5,
      paddingHorizontal: Spacing.md,
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    captureButton: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: 'white',
      justifyContent: 'center',
      alignItems: 'center',
    },
    captureButtonInner: {
      width: 64,
      height: 64,
      borderRadius: 30,
      borderWidth: 2,
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

  const onError = useCallback(
    (error: unknown) => {
      logger.error('CodeScanningCamera runtime error', error as Error)
      emitErrorModal(
        t('BCSC.CameraDisclosure.Error'),
        t('BCSC.CameraDisclosure.ErrorMessage'),
        ensureAppError(error, AppEventCode.ADD_CARD_CAMERA_BROKEN)
      )
    },
    [logger, emitErrorModal, t]
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

      emitErrorModal(
        t('BCSC.CameraDisclosure.Error'),
        t('BCSC.CameraDisclosure.ErrorTakingPhoto'),
        ensureAppError(error, AppEventCode.ADD_CARD_CAMERA_BROKEN)
      )
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'black', position: 'relative' }}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        device={device}
        format={format}
        isActive={isFocused}
        photo={true}
        video={true}
        photoQualityBalance="speed"
        isMirrored={false}
        onInitialized={() => logger.debug('MaskedCamera initialized')}
        onError={onError}
        codeScanner={codeScanner}
        torch={torchOn ? 'on' : 'off'}
        // Set fps to max supported by the selected format for smoother preview
        fps={format?.maxFps}
      />
      <SVGOverlay maskType={maskType} strokeColor={maskLineColor ?? ColorPalette.brand.tertiary} />
      <View style={styles.instructionText}>
        {cameraLabel && (
          <ThemedText style={{ color: 'white', textAlign: 'center' }} variant={'headingThree'}>
            {cameraLabel}
          </ThemedText>
        )}
        {cameraInstructions && (
          <ThemedText style={{ color: 'white', textAlign: 'center' }} variant={'headingFour'}>
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
          onPress={takePhoto}
          accessibilityLabel={t('BCSC.CameraDisclosure.TakePhoto')}
          accessibilityRole="button"
          testID={testIdWithKey('TakePhoto')}
        >
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>
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
