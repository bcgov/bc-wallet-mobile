import { useTheme } from '@bifold/core'
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export interface RadioButtonProps {
  label: string
  value: string
  selected: boolean
  onPress: (value: string) => void
  disabled?: boolean
  testID?: string
}

export const RadioButton: React.FC<RadioButtonProps> = ({
  label,
  value,
  selected,
  onPress,
  disabled = false,
  testID,
}) => {
  const { ColorPalette, TextTheme, Spacing } = useTheme()

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      backgroundColor: ColorPalette.brand.secondaryBackground,
    },
    radioCircle: {
      width: Spacing.lg,
      height: Spacing.lg,
      borderRadius: Spacing.lg / 2,
      borderWidth: 3,
      borderColor: disabled ? ColorPalette.grayscale.mediumGrey : ColorPalette.brand.primary,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    innerCircle: {
      width: Spacing.lg / 2,
      height: Spacing.lg / 2,
      borderRadius: Spacing.lg / 4,
      backgroundColor: disabled ? ColorPalette.grayscale.mediumGrey : ColorPalette.brand.primary,
    },
    label: {
      ...TextTheme.normal,
      color: disabled ? ColorPalette.grayscale.mediumGrey : ColorPalette.grayscale.white,
      flex: 1,
    },
  })

  const handlePress = () => {
    if (!disabled) {
      onPress(value)
    }
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      disabled={disabled}
      accessible
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
      testID={testID}
    >
      <Text style={styles.label}>{label}</Text>
      <View style={styles.radioCircle}>{selected && <View style={styles.innerCircle} />}</View>
    </TouchableOpacity>
  )
}
