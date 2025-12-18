import { QRScannerTorch, useTheme } from '@bifold/core'
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Animated,
  GestureResponderEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native'
import {
  Camera,
  CameraCaptureError,
  Code,
  CodeScannerFrame,
  CodeType,
  useCameraDevice,
  useCameraFormat,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera'

export interface CodeScanningCameraProps {
  codeTypes: CodeType[]

  /**
   * Callback function called when a code is successfully scanned
   * @param codes Array of scanned codes
   * @param frame The camera frame information
   */
  onCodeScanned: (codes: Code[], frame: CodeScannerFrame) => void

  /**
   * Custom style for the camera container
   */
  style?: ViewStyle

  /**
   * Should camera permission be requested
   * @default true
   */
  autoRequestPermission?: boolean

  /**
   * Which camera to use
   * @default 'back'
   */
  cameraType?: 'front' | 'back'
}

const CodeScanningCamera: React.FC<CodeScanningCameraProps> = ({
  codeTypes,
  onCodeScanned,
  style,
  autoRequestPermission = true,
  cameraType = 'back',
}) => {
  const { t } = useTranslation()
  const { ColorPalette, Spacing } = useTheme()
  const camera = useRef<Camera>(null)
  const [torchEnabled, setTorchEnabled] = useState(false)
  const { width } = useWindowDimensions()
  const { hasPermission, requestPermission } = useCameraPermission()
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null)
  const focusOpacity = useRef(new Animated.Value(0)).current
  const focusScale = useRef(new Animated.Value(1)).current
  const device = useCameraDevice(cameraType, {
    physicalDevices: Platform.select({
      // Note: Unable to focus camera on iOS without ultra-wide angle camera
      ios: ['ultra-wide-angle-camera'],
    }),
  })
  const format = useCameraFormat(device, [
    {
      videoResolution: 'max',
    },
    {
      fps: Platform.OS === 'ios' ? 'max' : 30,
    },
  ])
  const codeScanner = useCodeScanner({
    codeTypes,
    onCodeScanned: (codes, frame) => {
      if (codes.length > 0) {
        onCodeScanned(codes, frame)
      }
    },
  })

  useEffect(() => {
    if (!hasPermission) {
      requestPermission()
    }
  }, [hasPermission, requestPermission])

  const scanSize = Math.min(width - 80, 300)
  const scanAreaDimensions = { width: scanSize, height: scanSize / 4 }

  useEffect(() => {
    if (autoRequestPermission && !hasPermission) {
      requestPermission()
    }
  }, [hasPermission, requestPermission, autoRequestPermission])

  const toggleTorch = () => {
    setTorchEnabled((prev) => !prev)
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPalette.brand.primaryBackground,
      position: 'relative',
    },
    camera: {
      flex: 1,
    },
    overlayContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
    },
    overlayOpening: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: scanAreaDimensions.width,
      height: scanAreaDimensions.height,
      marginTop: -scanAreaDimensions.height / 2,
      marginLeft: -scanAreaDimensions.width / 2,
      borderRadius: 4,
      borderColor: ColorPalette.brand.primary,
      borderWidth: 3,
    },
    torchContainer: {
      position: 'absolute',
      right: Spacing.md,
      top: Spacing.lg,
    },
    focusIndicator: {
      position: 'absolute',
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 2,
      borderColor: ColorPalette.grayscale.white,
      backgroundColor: 'transparent',
    },
  })

  const drawFocusTap = (point: { x: number; y: number }): void => {
    // Draw a focus tap indicator on the camera preview
    setFocusPoint(point)

    focusOpacity.setValue(1)
    focusScale.setValue(1.5)

    Animated.parallel([
      Animated.timing(focusOpacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(focusScale, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setFocusPoint(null)
    })
  }

  const handleFocusTap = async (e: GestureResponderEvent): Promise<void> => {
    if (!device?.supportsFocus || !camera.current) {
      return
    }

    const { locationX: x, locationY: y } = e.nativeEvent
    const tapPoint = { x, y }
    drawFocusTap(tapPoint)

    try {
      await camera.current.focus(tapPoint)
    } catch (error) {
      // Ignore focus canceled errors
      if (error instanceof CameraCaptureError && error.code === 'capture/focus-canceled') {
        return
      }

      // Rethrow other errors
      throw error
    }
  }

  if (!device || !hasPermission) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'white' }}>{t('BCSC.CameraDisclosure.CameraPermissionRequired')}</Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, style]}>
      <Camera
        ref={camera}
        style={styles.camera}
        device={device}
        format={format}
        isActive={hasPermission}
        codeScanner={codeScanner}
        torch={torchEnabled ? 'on' : 'off'}
      />
      <Pressable
        style={StyleSheet.absoluteFill}
        onPressIn={(e) => {
          handleFocusTap(e)
        }}
      />
      {focusPoint && (
        <Animated.View
          style={[
            styles.focusIndicator,
            {
              left: focusPoint.x - 40,
              top: focusPoint.y - 40,
              opacity: focusOpacity,
              transform: [{ scale: focusScale }],
            },
          ]}
        />
      )}

      {/* scan area cutout */}
      <View style={styles.overlayContainer} pointerEvents="none">
        <View style={styles.overlayOpening} />
      </View>

      {/* reuse qrscannertorch from bifold */}
      <View style={styles.torchContainer}>
        <QRScannerTorch active={torchEnabled} onPress={toggleTorch} />
      </View>
    </View>
  )
}

export default CodeScanningCamera
