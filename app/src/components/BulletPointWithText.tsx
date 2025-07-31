import { ThemedText, useTheme } from '@bifold/core'
import { StyleSheet, View } from 'react-native'
import { Icon } from 'react-native-vector-icons/Icon'

interface BoldedBulletPointProps {
  text: string
  bold?: boolean
}

const BulletPointWithText: React.FC<BoldedBulletPointProps> = ({ text, bold = true }) => {
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
        <Icon name={'circle'} size={Spacing.sm} color={ColorPalette.brand.modalIcon} />
      </View>
      <ThemedText style={{ flexShrink: 1 }} variant={bold ? 'bold' : undefined}>
        {text}
      </ThemedText>
    </View>
  )
}

export default BulletPointWithText
