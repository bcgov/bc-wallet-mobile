import { useTheme } from '@bifold/core'
import React, { useCallback } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

interface RadioButtonProps<T> {
  label: string
  value: T
  selectedValue?: T
  onValueChange: (value: T) => void
  disabled?: boolean
  testID: string
}

export const RadioButton = <T,>({
  label,
  value,
  selectedValue,
  onValueChange,
  disabled = false,
  testID,
}: RadioButtonProps<T>) => {
  const { ColorPalette, TextTheme, Spacing } = useTheme()
  const selected = selectedValue === value

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

  const handlePress = useCallback(() => {
    if (!disabled) {
      onValueChange(value)
    }
  }, [disabled, onValueChange, value])

  return (
    <Pressable
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
    </Pressable>
  )
}
