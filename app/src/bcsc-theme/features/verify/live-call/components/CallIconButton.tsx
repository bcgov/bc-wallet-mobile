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
      style={{ justifyContent: 'center', alignItems: 'center' }}
    >
      <View style={styles.iconButton}>
        <Icon name={iconName} size={size - 32} color={primaryColor} />
      </View>
      <ThemedText style={{ color: primaryColor, marginTop: Spacing.xs }}>{label}</ThemedText>
    </TouchableOpacity>
  )
}

export default CallIconButton
