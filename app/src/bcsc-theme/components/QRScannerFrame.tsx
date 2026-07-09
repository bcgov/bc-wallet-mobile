import { ThemedText, useTheme } from '@bifold/core'
import React, { useState } from 'react'
import { NativeSyntheticEvent, StyleSheet, TextLayoutEventData, useWindowDimensions, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { getCutoutRect, QRScannerOverlay } from './QRScannerOverlay'

interface QRScannerFrameProps {
  /** Instruction text centered in the gap above the reticle */
  message: string
}

/**
 * Self-measuring scanner chrome for QR scan screens: dims the camera view behind a
 * rounded reticle cutout and centers the scan instructions between the top of the
 * camera area and the reticle. Absolutely fills its parent — render it as a sibling
 * immediately after the camera view.
 */
export const QRScannerFrame: React.FC<QRScannerFrameProps> = ({ message }) => {
  const { ColorPalette, Spacing } = useTheme()

  // The camera area excludes navigation chrome (header, tab bar), so the window is only
  // a close-enough first render; onLayout provides the real dimensions.
  const window = useWindowDimensions()
  const [area, setArea] = useState({ width: window.width, height: window.height })
  const cutout = getCutoutRect(area.width, area.height)

  // Wrapped text fills all the width it's offered, which would push the icon+text row
  // edge-to-edge and off the reticle's center line. Shrink the text box to its widest
  // rendered line so the row hugs its content and centers properly.
  const [messageTextWidth, setMessageTextWidth] = useState<number | undefined>(undefined)
  const handleMessageTextLayout = (event: NativeSyntheticEvent<TextLayoutEventData>) => {
    const { lines } = event.nativeEvent
    if (!lines.length) {
      return
    }

    const widestLine = Math.ceil(Math.max(...lines.map((line) => line.width)))
    setMessageTextWidth((current) => (current === widestLine ? current : widestLine))
  }

  const styles = StyleSheet.create({
    icon: {
      color: ColorPalette.grayscale.white,
    },
    messageContainer: {
      // Centered in the gap between the top of the camera area and the reticle
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: cutout.y,
      paddingHorizontal: 40,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.md,
    },
    messageText: {
      color: ColorPalette.grayscale.white,
      flexShrink: 1,
    },
  })

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout
        setArea((current) => (current.width === width && current.height === height ? current : { width, height }))
      }}
    >
      <QRScannerOverlay width={area.width} height={area.height} />
      <View style={styles.messageContainer}>
        <Icon name="qrcode-scan" size={40} style={styles.icon} />
        <ThemedText
          style={[styles.messageText, messageTextWidth !== undefined && { width: messageTextWidth }]}
          onTextLayout={handleMessageTextLayout}
        >
          {message}
        </ThemedText>
      </View>
    </View>
  )
}
