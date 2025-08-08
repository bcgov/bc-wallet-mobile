import { View, StyleSheet, useWindowDimensions } from 'react-native'
import { useTheme } from '@bifold/core'

export interface CircularMaskProps {
  maskWidth?: number
  maskHeight?: number
  maskBorderRadius?: number
}

const CircularMask: React.FC<CircularMaskProps> = ({
  maskWidth: customWidth,
  maskHeight: customHeight,
  maskBorderRadius: customBorderRadius,
}) => {
  const { Spacing, ColorPalette } = useTheme()
  const { width } = useWindowDimensions()

  // Use provided dimensions or calculate defaults
  const maskWidth = customWidth ?? width - Spacing.lg * 2
  const maskHeight = customHeight ?? width * 1.2
  const maskBorderRadius = customBorderRadius ?? maskWidth / 2

  const styles = StyleSheet.create({
    mask: {
      flex: 1,
      backgroundColor: ColorPalette.notification.popupOverlay,
      alignItems: 'center',
      justifyContent: 'center',
    },
    maskShape: {
      backgroundColor: 'white',
      width: maskWidth,
      height: maskHeight,
      borderRadius: maskBorderRadius,
    },
  })

  return (
    <View style={styles.mask}>
      <View style={styles.maskShape} />
    </View>
  )
}

export default CircularMask
