import { useWindowDimensions, View, StyleSheet } from 'react-native'
import { useTheme } from '@bifold/core'

interface RectangularMaskProps {
  aspectRatio?: number // Default CR80 card ratio is 1.59
  padding?: number
}

const RectangularMask: React.FC<RectangularMaskProps> = ({
  aspectRatio = 1.59, // Standard ID card ratio (3.375/2.125)
  padding = 40,
}) => {
  const { width: screenWidth } = useWindowDimensions()
  const { ColorPallet } = useTheme()

  // Calculate mask dimensions
  const maskWidth = screenWidth - padding * 2
  const maskHeight = maskWidth / aspectRatio

  const styles = StyleSheet.create({
    maskContainer: {
      flex: 1,
      backgroundColor: ColorPallet.notification.popupOverlay,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardMask: {
      width: maskWidth,
      height: maskHeight,
      backgroundColor: 'black',
      borderRadius: 8, // Slight rounding for ID card corners
      borderWidth: 2,
      borderColor: 'white',
    },
  })

  return (
    <View style={styles.maskContainer}>
      <View style={styles.cardMask} />
    </View>
  )
}

export default RectangularMask
