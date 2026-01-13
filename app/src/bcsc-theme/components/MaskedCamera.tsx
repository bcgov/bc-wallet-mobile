import { MaskType, SVGOverlay, ThemedText, TOKENS, useServices, useTheme } from '@bifold/core'
import { useIsFocused } from '@react-navigation/native'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import {
  Camera,
  CodeScanner,
  FormatFilter,
  useCameraDevice,
  useCameraFormat,
  useCameraPermission,
} from 'react-native-vision-camera'

type MaskedCameraProps = {
  navigation: any
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
  const { hasPermission, requestPermission } = useCameraPermission()
  const [isActive, setIsActive] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const cameraRef = useRef<Camera>(null)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const isFocused = useIsFocused()
  const format = useCameraFormat(device, cameraFormatFilter)
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

  useEffect(() => {
    const checkPermissions = async () => {
      if (!hasPermission) {
        const permission = await requestPermission()
        if (!permission) {
          Alert.alert(
            t('BCSC.CameraDisclosure.CameraPermissionRequired'),
            t('BCSC.CameraDisclosure.CameraPermissionRequiredMessage'),
            [{ text: t('BCSC.CameraDisclosure.OK'), onPress: () => navigation.goBack() }]
          )
          return
        }
      }
    }

    checkPermissions()
  }, [hasPermission, requestPermission, navigation, t])

  const toggleTorch = () => setTorchOn((prev: boolean) => !prev)

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: 'white' }}>{t('BCSC.CameraDisclosure.CameraPermissionRequired')}</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!device) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: 'white' }}>{t('BCSC.CameraDisclosure.NoCameraAvailable', { device })}</Text>
        </View>
      </SafeAreaView>
    )
  }

  const handleCancel = () => {
    navigation.goBack()
  }
  const onError = (error: any) => {
    logger.error(`Camera error: ${error}`)
    Alert.alert(t('BCSC.CameraDisclosure.Error'), t('BCSC.CameraDisclosure.ErrorMessage'))
  }

  const takePhoto = async () => {
    try {
      if (cameraRef.current && isActive) {
        const photo = await cameraRef.current.takePhoto({
          flash: 'off',
          enableShutterSound: false,
        })

        onPhotoTaken(photo.path)
        logger.info(`Photo taken and saved temporarily: ${photo.path}`)
      }
    } catch (error) {
      logger.error(`Error taking photo: ${error}`)
      Alert.alert(t('BCSC.CameraDisclosure.Error'), t('BCSC.CameraDisclosure.ErrorTakingPhoto'))
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'black', position: 'relative' }}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        device={device}
        format={format}
        isActive={isFocused && isActive}
        photo={true}
        onInitialized={() => setIsActive(true)}
        onError={onError}
        codeScanner={codeScanner}
        torch={torchOn ? 'on' : 'off'}
        // Set fps to max supported by the selected format for smoother preview
        fps={format?.maxFps ?? 60}
        androidPreviewViewType="surface-view"
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
        <TouchableOpacity style={{ flex: 1 }} onPress={handleCancel}>
          <ThemedText style={{ color: ColorPalette.grayscale.white }}>{t('Global.Cancel')}</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>
        {hasTorch ? (
          <TouchableOpacity style={{ flex: 1, alignItems: 'flex-end' }} onPress={toggleTorch}>
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
