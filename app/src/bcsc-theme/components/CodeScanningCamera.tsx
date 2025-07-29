import { useTheme } from '@bifold/core'
import React, { useEffect, useRef, useState } from 'react'
import { StyleSheet, View, ViewStyle, useWindowDimensions, ColorValue } from 'react-native'
import {
  Camera,
  useCameraPermission,
  useCameraDevice,
  useCodeScanner,
  CodeType,
  Code,
  CodeScannerFrame,
} from 'react-native-vision-camera'
import QRScannerTorch from '@bifold/core/src/components/misc/QRScannerTorch'

const overlayTint: ColorValue = 'rgba(0, 0, 0, 0.4)'

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
  const { ColorPalette } = useTheme()
  const camera = useRef<Camera>(null)
  const [torchEnabled, setTorchEnabled] = useState(false)
  const { width } = useWindowDimensions()

  const { hasPermission, requestPermission } = useCameraPermission()
  const device = useCameraDevice(cameraType)
  useEffect(() => {
    if (!hasPermission) {
      requestPermission()
    }
  }, [hasPermission, requestPermission])

  const scanSize = Math.min(width - 80, 250)

  const getScanAreaDimensions = () => {
    // if we want to use a different sized
    // scan area for different code types,
    // this can be adjusted to return different width/height
    // depending on codetypes passed

    // the current value roughly matches the shape
    // of either code on a dl/ combined card
    const scanWidth = scanSize * 1.3
    const scanHeight = scanWidth / 5

    return {
      width: scanWidth,
      height: scanHeight,
    }
  }

  const scanAreaDimensions = getScanAreaDimensions()

  const codeScanner = useCodeScanner({
    codeTypes,
    onCodeScanned: (codes, frame) => {
      if (codes.length > 0) {
        onCodeScanned(codes, frame)
      }
    },
  })

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
    overlayTop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: '50%',
      marginBottom: scanAreaDimensions.height / 2,
      backgroundColor: overlayTint,
    },
    overlayBottom: {
      position: 'absolute',
      top: '50%',
      marginTop: scanAreaDimensions.height / 2,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: overlayTint,
    },
    overlayLeft: {
      position: 'absolute',
      top: '50%',
      marginTop: -scanAreaDimensions.height / 2,
      left: 0,
      right: '50%',
      marginRight: scanAreaDimensions.width / 2,
      height: scanAreaDimensions.height,
      backgroundColor: overlayTint,
    },
    overlayRight: {
      position: 'absolute',
      top: '50%',
      marginTop: -scanAreaDimensions.height / 2,
      right: 0,
      left: '50%',
      marginLeft: scanAreaDimensions.width / 2,
      height: scanAreaDimensions.height,
      backgroundColor: overlayTint,
    },
    overlayOpening: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: scanAreaDimensions.width,
      height: scanAreaDimensions.height,
      marginTop: -scanAreaDimensions.height / 2,
      marginLeft: -scanAreaDimensions.width / 2,
      borderColor: 'rgba(255, 255, 255, 0.8)',
      borderWidth: 2,
    },
    torchContainer: {
      position: 'absolute',
      bottom: 0,
      right: 24,
      zIndex: 10,
    },
  })

  if (!device || !hasPermission) {
    // return placeholder view
    return (
      <View style={[styles.container, style]}>
        <View style={styles.overlayContainer}>
          <View style={styles.overlayTop} />
          <View style={styles.overlayBottom} />
          <View style={styles.overlayLeft} />
          <View style={styles.overlayRight} />
          <View style={styles.overlayOpening} />
        </View>
        <View style={styles.torchContainer}>
          <QRScannerTorch active={torchEnabled} onPress={toggleTorch} />
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, style]}>
      <Camera
        ref={camera}
        style={styles.camera}
        device={device}
        isActive={hasPermission}
        codeScanner={codeScanner}
        torch={torchEnabled ? 'on' : 'off'}
      />
      {/* scan area cutout */}
      <View style={styles.overlayContainer}>
        <View style={styles.overlayTop} />
        <View style={styles.overlayBottom} />
        <View style={styles.overlayLeft} />
        <View style={styles.overlayRight} />
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
