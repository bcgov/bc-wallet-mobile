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
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
      marginBottom: Spacing.sm,
    },
    title: {
      color: ColorPallet.brand.primary,
      marginLeft: Spacing.sm,
    },
    description: {
      flexShrink: 1,
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
      <View style={{ flex: 1 }}>
        <View style={styles.titleContainer}>
          <Icon name={icon} size={iconSize} color={ColorPallet.brand.primary} />
          <ThemedText variant={'bold'} style={styles.title} numberOfLines={0}>
            {title}
          </ThemedText>
        </View>
        <ThemedText numberOfLines={0} style={styles.description}>{description}</ThemedText>
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
