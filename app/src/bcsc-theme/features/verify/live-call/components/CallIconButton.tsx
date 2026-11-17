import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { ColorValue, StyleSheet, TouchableOpacity, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

type CallIconButtonProps = {
  onPress: () => void
  primaryColor: ColorValue
  secondaryColor: ColorValue
  size: number
  iconName: string
  label: string
  testIDKey: string
}

const CallIconButton = ({
  onPress,
  primaryColor,
  secondaryColor,
  size,
  iconName,
  label,
  testIDKey,
}: CallIconButtonProps) => {
  const { Spacing } = useTheme()
  const styles = StyleSheet.create({
    // Each control owns a third of the row so its label wraps in its own column at large OS font
    // sizes instead of colliding with its neighbours (#4401)
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    label: {
      color: primaryColor,
      marginTop: Spacing.xs,
      textAlign: 'center',
    },
    iconButton: {
      width: size,
      height: size,
      borderRadius: size / 2,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: secondaryColor,
      borderWidth: 1,
      borderColor: primaryColor,
    },
  })

  return (
    <TouchableOpacity
      onPress={onPress}
      testID={testIdWithKey(testIDKey)}
      accessibilityLabel={label}
      accessibilityRole="button"
      // Side by side with its neighbours, so the slop is vertical only and stays inside the row
      hitSlop={{ top: Spacing.sm, bottom: Spacing.sm }}
      style={styles.container}
    >
      <View style={styles.iconButton}>
        <Icon name={iconName} size={size - 32} color={primaryColor} />
      </View>
      <ThemedText style={styles.label}>{label}</ThemedText>
    </TouchableOpacity>
  )
}

export default CallIconButton
