import { QRScannerTorch, useTheme } from '@bifold/core'
import { useFocusEffect } from '@react-navigation/native'
import React, { useCallback, useEffect, useRef, useState } from 'react'
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
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'
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

/**
 * Extended Code interface with position and orientation metadata
 */
export interface EnhancedCode extends Code {
  /**
   * Position of the barcode in the camera frame
   */
  position?: { x: number; y: number; width: number; height: number }
  /**
   * Orientation of the barcode (horizontal or vertical)
   */
  orientation?: 'horizontal' | 'vertical'
}

export interface CodeScanningCameraProps {
  codeTypes: CodeType[]

  /**
   * Callback function called when a code is successfully scanned
   * @param codes Array of scanned codes with position and orientation metadata
   * @param frame The camera frame information
   */
  onCodeScanned: (codes: EnhancedCode[], frame: CodeScannerFrame) => void

  /**
   * Custom style for the camera container
   */
  style?: ViewStyle

  /**
   * Which camera to use
   * @default 'back'
   */
  cameraType?: 'front' | 'back'

  /**
   * Enable/disable barcode highlight overlay
   * When enabled, shows visual feedback for detected barcodes
   * @default false
   */
  showBarcodeHighlight?: boolean

  /**
   * Enable/disable pinch-to-zoom gesture
   * @default true
   */
  enableZoom?: boolean

  /**
   * Initial zoom level
   * @default 1.0
   */
  initialZoom?: number

  /**
   * Minimum zoom level
   * @default 1.0
   */
  minZoom?: number

  /**
   * Maximum zoom level (will be constrained by device capabilities)
   * @default 4.0
   */
  maxZoom?: number
}

const CodeScanningCamera: React.FC<CodeScanningCameraProps> = ({
  codeTypes,
  onCodeScanned,
  style,
  cameraType = 'back',
  showBarcodeHighlight = false,
  enableZoom = true,
  initialZoom = 1.0,
  minZoom = 1.0,
  maxZoom = 4.0,
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

  // Zoom state management
  const [zoom, setZoom] = useState(initialZoom)
  const zoomOffset = useRef(initialZoom)

  // Barcode highlight state
  const [detectedCodes, setDetectedCodes] = useState<EnhancedCode[]>([])
  const highlightFadeAnim = useRef(new Animated.Value(0)).current

  /**
   * Select the optimal camera device for barcode scanning
   * Prioritizes devices with better focus capabilities
   */
  const device = useCameraDevice(cameraType, {
    physicalDevices: Platform.select({
      // On iOS, prefer ultra-wide-angle camera for better focus control
      // This is particularly important for scanning small barcodes
      ios: ['ultra-wide-angle-camera', 'wide-angle-camera'],
      // On Android, prefer wide-angle camera
      android: ['wide-angle-camera'],
    }),
  })

  /**
   * Optimize camera format for small barcode scanning
   * Higher resolution and frame rate improve detection accuracy
   */
  const format = useCameraFormat(device, [
    // Higher FPS for better barcode detection on small codes
    {
      fps: Platform.OS === 'ios' ? 'max' : 60,
    },
    // High photo resolution for better barcode recognition
    {
      photoResolution: { width: 1920, height: 1080 },
    },
    // Prefer formats with better video stabilization
    {
      videoStabilizationMode: 'auto',
    },
  ])

  /**
   * Calculate barcode orientation based on dimensions
   * @param corners Corner points of the detected barcode
   * @returns 'horizontal' or 'vertical'
   */
  const calculateOrientation = (corners?: { x: number; y: number }[]): 'horizontal' | 'vertical' => {
    if (!corners || corners.length < 2) {
      return 'horizontal'
    }

    // Calculate width and height from corners
    const width = Math.abs(corners[1].x - corners[0].x)
    const height = Math.abs(corners[2].y - corners[0].y)

    // If width > height, it's horizontal, otherwise vertical
    return width > height ? 'horizontal' : 'vertical'
  }

  /**
   * Enhanced code scanner with position and orientation metadata
   */
  const codeScanner = useCodeScanner({
    codeTypes,
    onCodeScanned: (codes, frame) => {
      if (codes.length > 0) {
        // Enhance codes with position and orientation metadata
        const enhancedCodes: EnhancedCode[] = codes.map((code) => {
          const corners = code.corners

          // Calculate bounding box from corners if available
          let position: { x: number; y: number; width: number; height: number } | undefined
          if (corners && corners.length >= 4) {
            const xs = corners.map((c) => c.x)
            const ys = corners.map((c) => c.y)
            const minX = Math.min(...xs)
            const maxX = Math.max(...xs)
            const minY = Math.min(...ys)
            const maxY = Math.max(...ys)

            position = {
              x: minX,
              y: minY,
              width: maxX - minX,
              height: maxY - minY,
            }
          }

          const orientation = calculateOrientation(corners)

          return {
            ...code,
            position,
            orientation,
          }
        })

        // Update detected codes for highlight overlay
        if (showBarcodeHighlight) {
          setDetectedCodes(enhancedCodes)
          // Fade in the highlight
          Animated.timing(highlightFadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }).start()

          // Fade out after 2 seconds
          setTimeout(() => {
            Animated.timing(highlightFadeAnim, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }).start(() => {
              setDetectedCodes([])
            })
          }, 2000)
        }

        onCodeScanned(enhancedCodes, frame)
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

  useFocusEffect(
    useCallback(() => {
      // Reset zoom when screen loses focus
      return () => {
        setTorchEnabled(false)
        setZoom(initialZoom)
        zoomOffset.current = initialZoom
      }
    }, [initialZoom])
  )

  const toggleTorch = () => {
    setTorchEnabled((prev) => !prev)
  }

  /**
   * Pinch-to-zoom gesture handler
   * Allows users to zoom in on small barcodes for better scanning
   * 
   * Note: All logic must be inline within the gesture callbacks
   * to ensure it runs in the worklet context (react-native-reanimated)
   * State updates must be wrapped with runOnJS to call from worklet
   */
  const pinchGesture = Gesture.Pinch()
    .enabled(enableZoom)
    .onUpdate((event) => {
      // Calculate new zoom level based on pinch scale
      const rawZoom = zoomOffset.current * event.scale
      
      // Constrain zoom level to device capabilities and configured limits
      // This logic must be inline to work in the worklet context
      const deviceMinZoom = device?.minZoom ?? 1
      const deviceMaxZoom = device?.maxZoom ?? 1
      const effectiveMinZoom = Math.max(minZoom, deviceMinZoom)
      const effectiveMaxZoom = Math.min(maxZoom, deviceMaxZoom)
      const newZoom = Math.max(effectiveMinZoom, Math.min(rawZoom, effectiveMaxZoom))
      
      // Must use runOnJS to call React state setter from worklet
      runOnJS(setZoom)(newZoom)
    })
    .onEnd(() => {
      // Save the current zoom level as the new offset
      zoomOffset.current = zoom
    })

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
    barcodeHighlight: {
      position: 'absolute',
      borderWidth: 2,
      borderColor: '#00FF00',
      backgroundColor: 'rgba(0, 255, 0, 0.1)',
    },
    zoomIndicator: {
      position: 'absolute',
      bottom: 100,
      alignSelf: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    zoomText: {
      color: 'white',
      fontSize: 14,
      fontWeight: 'bold',
    },
  })

  /**
   * Enhanced tap-to-focus handler
   * Allows precise focus on small barcodes
   */
  const drawFocusTap = (point: { x: number; y: number }): void => {
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
      <GestureDetector gesture={pinchGesture}>
        <View style={{ flex: 1 }}>
          <Camera
            ref={camera}
            style={styles.camera}
            device={device}
            format={format}
            isActive={hasPermission}
            codeScanner={codeScanner}
            torch={torchEnabled ? 'on' : 'off'}
            zoom={zoom}
          />
        </View>
      </GestureDetector>

      <Pressable
        style={StyleSheet.absoluteFill}
        onPressIn={(e) => {
          handleFocusTap(e)
        }}
      />

      {/* Focus indicator */}
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

      {/* Barcode highlight overlay */}
      {showBarcodeHighlight &&
        detectedCodes.map((code, index) => {
          if (!code.position) {
            return null
          }

          return (
            <Animated.View
              key={`${code.type}-${index}`}
              style={[
                styles.barcodeHighlight,
                {
                  left: code.position.x,
                  top: code.position.y,
                  width: code.position.width,
                  height: code.position.height,
                  opacity: highlightFadeAnim,
                },
              ]}
            />
          )
        })}

      {/* Scan area guide */}
      <View style={styles.overlayContainer} pointerEvents="none">
        <View style={styles.overlayOpening} />
      </View>

      {/* Zoom level indicator */}
      {enableZoom && zoom > minZoom && (
        <View style={styles.zoomIndicator}>
          <Text style={styles.zoomText}>{zoom.toFixed(1)}x</Text>
        </View>
      )}

      {/* Torch toggle button */}
      <View style={styles.torchContainer}>
        <QRScannerTorch active={torchEnabled} onPress={toggleTorch} />
      </View>
    </View>
  )
}

export default CodeScanningCamera
