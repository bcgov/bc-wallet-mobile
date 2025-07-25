import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { ThemedText, TOKENS, useServices, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useEffect, useState, useRef } from 'react'
import { StyleSheet, View, Text, Alert, TouchableOpacity, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera'
import MaskedView from '@react-native-masked-view/masked-view'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

type MAskedCameraProps = {
  navigation: any
  cameraFace: 'front' | 'back'
  cameraMask: any // should be a masked component
  // handleCancel: () => void
}

const MaskedCamera = ({ navigation, cameraMask, cameraFace = 'back' }: MAskedCameraProps) => {
  const device = useCameraDevice(cameraFace)
  const cameraRef = useRef<Camera>(null)

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      position: 'relative',
    },
    camera: {
      flex: 1,
    },
  })
  const { hasPermission, requestPermission } = useCameraPermission()
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
          <Text style={{ color: 'white' }}>No front camera available</Text>
        </View>
      </SafeAreaView>
    )
  }

  const handleCancel = () => {
    console.log('CANCEL THIS CAMERA')
  }
  const onError = (error: any) => {
    console.log('OOPS, there was a camera error')
  }

  // Ok whats the point though, I think I could just modify the screen to handle things differently?
  // umm components and screens get messy
  // so it will be two screens? yes because my screen needs to be able to handle multiple pictures at once, so we an handle things a little differently
  // ok sounds like I need to keep going then
  // woohoo

  return (
    <SafeAreaView style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        device={device}
        isActive={isActive}
        photo={true}
        onInitialized={onInitialized}
        onError={onError}
        torch={torchOn ? 'on' : 'off'}
      />
    </SafeAreaView>
  )
}

export default MaskedCamera
