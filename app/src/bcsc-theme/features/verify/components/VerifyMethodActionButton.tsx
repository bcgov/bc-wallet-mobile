import { ThemedText, useTheme } from '@bifold/core'
import { ActivityIndicator, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

type VerifyMethodActionButtonProps = {
  style?: ViewStyle
  icon: string
  title: string
  description: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
}

const iconSize = 36

const VerifyMethodActionButton = ({
  style = {},
  title,
  description,
  icon,
  onPress,
  loading,
  disabled = false,
}: VerifyMethodActionButtonProps) => {
  const { ColorPallet, Spacing, TextTheme } = useTheme()

  const styles = StyleSheet.create({
    container: {
      backgroundColor: ColorPallet.brand.secondaryBackground,
      padding: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: ColorPallet.brand.tertiary,
      borderBottomWidth: 1,
      borderBottomColor: ColorPallet.brand.tertiary,
      flexDirection: 'row',
      alignItems: 'center',
      ...style,
    },
    title: {
      color: ColorPallet.brand.primary,
      marginBottom: Spacing.sm,
    },
    textContainer: {
      marginHorizontal: Spacing.md,
      flex: 1,
    },
    iconContainer: {
      justifyContent: 'center',
    },
    chevronContainer: {
      justifyContent: 'center',
    },
  })

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => {
        if (!disabled && !loading) onPress()
      }}
    >
      <View style={styles.iconContainer}>
        <Icon name={icon} size={iconSize} color={ColorPallet.brand.primary} />
      </View>
      <View style={styles.textContainer}>
        <ThemedText variant={'bold'} style={styles.title} numberOfLines={0}>
          {title}
        </ThemedText>
        <ThemedText numberOfLines={0}>{description}</ThemedText>
      </View>
      <View style={styles.chevronContainer}>
        {loading ? (
          <ActivityIndicator size="small" color={TextTheme.normal.color} />
        ) : (
          <Icon name={'chevron-right'} size={iconSize} color={TextTheme.normal.color} />
        )}
      </View>
    </TouchableOpacity>
  )
}

export default VerifyMethodActionButton
