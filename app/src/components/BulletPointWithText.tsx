import { ThemedText, useTheme } from '@bifold/core'
import { StyleSheet, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
interface BoldedBulletPointProps {
  text: string
  bold?: boolean
  iconSize?: number
  iconColor?: string
}

const BulletPointWithText: React.FC<BoldedBulletPointProps> = ({ text, bold, iconSize, iconColor }) => {
  const { ColorPalette, Spacing } = useTheme()

  const styles = StyleSheet.create({
    container: {
      marginVertical: Spacing.sm,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    iconContainer: {
      margin: Spacing.sm,
    },
  })

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Icon name={'circle'} size={iconSize ?? Spacing.sm} color={iconColor ?? ColorPalette.brand.modalIcon} />
      </View>
      <ThemedText style={{ flexShrink: 1 }} variant={bold ? 'bold' : undefined}>
        {text}
      </ThemedText>
    </View>
  )
}

export default BulletPointWithText
