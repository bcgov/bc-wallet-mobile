import { useTheme } from '@bifold/core'
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { ThemedText } from '@bifold/core'

type VerifyMethodActionButtonProps = {
  style?: ViewStyle
  icon: string
  title: string
  description: string
  onPress: () => void
}

const VerifyMethodActionButton = ({ style = {}, title, description, icon, onPress }: VerifyMethodActionButtonProps) => {
  const { ColorPallet, Spacing, TextTheme } = useTheme()

  const styles = StyleSheet.create({
    container: {
      backgroundColor: ColorPallet.brand.secondaryBackground,
      padding: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: ColorPallet.brand.tertiary,
      borderBottomWidth: 1,
      borderBottomColor: ColorPallet.brand.tertiary,
      ...style,
    },
    title: {
      color: ColorPallet.brand.primary,
      marginBottom: Spacing.sm,
    },
    textContainer: {
      flex: 7,
    },
    iconContainer: {
      flex: 2,
      justifyContent: 'center',
    },
    chevronContainer: {
      flex: 1,
      justifyContent: 'center',
    },
  })

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={styles.iconContainer}>
          <Icon name={icon} size={32} color={ColorPallet.brand.primary} />
        </View>
        <View style={styles.textContainer}>
          <ThemedText variant={'bold'} style={styles.title}>
            {title}
          </ThemedText>
          <ThemedText>{description}</ThemedText>
        </View>
        <View style={styles.chevronContainer}>
          <Icon name={'chevron-right'} size={24} color={TextTheme.normal.color} />
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default VerifyMethodActionButton