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
import { Camera, CameraOutput, CameraPhotoOutput } from 'react-native-vision-camera'
import { useBCSCActivity } from '../contexts/BCSCActivityContext'
import { useVisionCamera, useVisionCameraControls } from '../hooks/useVisionCamera'
import { isBackgroundedAppState } from '../utils/app-state'
import { getCameraMetadata } from './utils/camera'

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
  // photoQualityBalance = 'speed',
  cameraFace = 'back',
  onPhotoTaken,
}: MaskedCameraProps) => {
  const { t } = useTranslation()
  const safeAreaInsets = useSafeAreaInsets()
  const { Spacing, ColorPalette } = useTheme()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const isFocused = useIsFocused()
  const { emitErrorModal } = useErrorAlert()
  const { preventDoublePress } = usePreventDoublePress()
  const { appStateStatus } = useBCSCActivity()

  const { cameraRef, device, takePhoto } = useVisionCamera({
    position: cameraFace,
    photoOutput,
  })
  const { hasTorch, isTorchEnabled, enableTorch } = useVisionCameraControls(cameraRef)

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

  useEffect(() => {
    if (!device) {
      // provide back button if they have no working camera
      navigation.setOptions({
        headerShown: true,
      })
    }
  }, [device, navigation])

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
    if (!isFocused) {
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
        isActive={isFocused && !isBackgroundedAppState(appStateStatus)}
        onError={onError}
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
            onPress={() => enableTorch(!isTorchEnabled)}
            accessibilityLabel={t('BCSC.CameraDisclosure.ToggleFlash')}
            accessibilityRole="button"
            testID={testIdWithKey('ToggleFlash')}
          >
            <Icon size={24} name={isTorchEnabled ? 'flash' : 'flash-off'} color={ColorPalette.grayscale.white} />
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }} />
        )}
      </View>
    </View>
  )
}

export default MaskedCamera
