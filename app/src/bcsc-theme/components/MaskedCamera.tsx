import { MaskType, SVGOverlay, ThemedText, TOKENS, useServices, useTheme } from '@bifold/core'
import { useEffect, useRef, useState } from 'react'
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera'

type MaskedCameraProps = {
  navigation: any
  cameraFace: 'front' | 'back'
  cameraInstructions?: string
  cameraLabel?: string
  maskType?: MaskType
  onPhotoTaken: (path: string) => void
}

const MaskedCamera = ({
  navigation,
  cameraInstructions,
  cameraLabel,
  maskType,
  cameraFace = 'back',
  onPhotoTaken,
}: MaskedCameraProps) => {
  const device = useCameraDevice(cameraFace)

  const { Spacing, ColorPalette } = useTheme()
  const { hasPermission, requestPermission } = useCameraPermission()
  const [isActive, setIsActive] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const cameraRef = useRef<Camera>(null)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
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
    },
    instructionText: {
      backgroundColor: 'transparent',
      position: 'absolute',
      fontWeight: 'normal',
      top: Spacing.lg,
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
          Alert.alert('Camera Permission Required', 'Please enable camera permission to take a photo.', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ])
          return
        }
      }
    }

    checkPermissions()
  }, [hasPermission, requestPermission, navigation])

  const toggleTorch = () => setTorchOn((prev: boolean) => !prev)

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: 'white' }}>Camera permission required</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!device) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: 'white' }}>{`No ${device} camera available`}</Text>
        </View>
      </SafeAreaView>
    )
  }

  const handleCancel = () => {
    navigation.goBack()
  }
  const onError = (error: any) => {
    logger.error(`Camera error: ${error}`)
    Alert.alert('Camera Error', 'An error occurred while using the camera. Please try again.')
  }

  const takePhoto = async () => {
    try {
      if (cameraRef.current && isActive) {
        const photo = await cameraRef.current.takePhoto({
          flash: 'off',
        })

        onPhotoTaken(photo.path)
        logger.info(`Photo taken and saved temporarily: ${photo.path}`)
      }
    } catch (error) {
      logger.error(`Error taking photo: ${error}`)
      Alert.alert('Error', 'Failed to take photo. Please try again.')
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'black', position: 'relative' }}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        device={device}
        isActive={isActive}
        photo={true}
        onInitialized={() => setIsActive(true)}
        onError={onError}
        torch={torchOn ? 'on' : 'off'}
      />
      <SVGOverlay maskType={maskType} strokeColor={ColorPalette.brand.tertiary} />
      <View style={styles.instructionText}>
        <ThemedText style={{ color: 'white' }} variant={'headingThree'}>
          {cameraLabel}
        </ThemedText>
        <ThemedText style={{ color: 'white' }} variant={'headingFour'}>
          {cameraInstructions}
        </ThemedText>
      </View>
      <View style={styles.controlsContainer}>
        <TouchableOpacity style={{ flex: 1 }} onPress={handleCancel}>
          <ThemedText style={{ color: ColorPalette.grayscale.white }}>Cancel</ThemedText>
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
