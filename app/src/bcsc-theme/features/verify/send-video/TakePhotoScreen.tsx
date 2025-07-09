import { BCSCScreens, BCSCVerifyIdentityStackParams } from "@/bcsc-theme/types/navigators"
import { ThemedText, TOKENS, useServices, useTheme } from "@bifold/core"
import { StackNavigationProp } from "@react-navigation/stack"
import { useEffect, useState, useRef } from "react"
import { StyleSheet, View, Text, Alert, TouchableOpacity, useWindowDimensions } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Camera, useCameraDevice, useCameraPermission } from "react-native-vision-camera"
import MaskedView from "@react-native-masked-view/masked-view"

type PhotoInstructionsScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.TakePhoto>
}

const TakePhotoScreen = ({ navigation }: PhotoInstructionsScreenProps) => {
  const { Spacing } = useTheme()
  const { hasPermission, requestPermission } = useCameraPermission()
  const device = useCameraDevice('front')
  const [isActive, setIsActive] = useState(false)
  const cameraRef = useRef<Camera>(null)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { width, height } = useWindowDimensions()
  const maskWidth = width - Spacing.md * 2
  const maskHeight = height * 0.6
  const maskBorderRadius = maskWidth / 2

  const takePhoto = async () => {
    try {
      if (cameraRef.current && isActive) {
        const photo = await cameraRef.current.takePhoto({
          flash: 'off',
        })
        
        // Navigate to photo review screen with the photo data
        navigation.navigate(BCSCScreens.PhotoReview, {
          photoPath: photo.path
        })

        logger.info(`Photo taken and saved temporarily: ${photo.path}`)
      }
    } catch (error) {
      logger.error(`Error taking photo: ${error}`)
      Alert.alert('Error', 'Failed to take photo. Please try again.')
    }
  }

  const handleCancel = () => {
    navigation.goBack()
  }

  useEffect(() => {
    const checkPermissions = async () => {
      if (!hasPermission) {
        const permission = await requestPermission()
        if (!permission) {
          Alert.alert(
            'Camera Permission Required',
            'Please enable camera permission to take a photo.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          )
          return
        }
      }
    }

    checkPermissions()
  }, [hasPermission, requestPermission, navigation])


  const onInitialized = () => {
    setIsActive(true)
  }

  const onError = (error: any) => {
    // eslint-disable-next-line no-console
    console.error('Camera error:', error)
    Alert.alert('Camera Error', 'There was an issue with the camera. Please try again.')
  }

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      position: 'relative',
    },
    camera: {
      flex: 1,
    },
    controlsContainer: {
      position: 'absolute',
      bottom: 30,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    instructionText: {
      color: 'white',
      textAlign: 'center',
      backgroundColor: 'transparent',
      position: 'absolute',
      top: 65,
      left: 0,
      right: 0,
      zIndex: 5,
      paddingHorizontal: Spacing.md,
    },
    cancelButton: {
      position: 'absolute',
      left: 30,
      paddingVertical: 10,
      paddingHorizontal: 15,
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
      backgroundColor: 'white',
      borderColor: '#CCC',
      borderWidth: 2,
    }
  })

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.pageContainer}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: 'white' }}>Camera permission required</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!device) {
    return (
      <SafeAreaView style={styles.pageContainer}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: 'white' }}>No front camera available</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.pageContainer}>
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        <MaskedView
          style={{ flex: 1, backgroundColor: 'black' }}
          maskElement={
            <View style={{flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', alignItems: 'center', justifyContent: 'center'}}>
              <View style={{ backgroundColor: 'white', width: maskWidth, height: maskHeight, borderRadius: maskBorderRadius }}/>
            </View>
          }
        >
          <Camera
            ref={cameraRef}
            style={styles.camera}
            device={device}
            isActive={isActive}
            photo={true}
            onInitialized={onInitialized}
            onError={onError}
          />
        </MaskedView>
        <ThemedText style={styles.instructionText}>
          Position your face within the oval frame
        </ThemedText>
        <View style={styles.controlsContainer}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <ThemedText style={{ color: 'white' }}>Cancel</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

export default TakePhotoScreen