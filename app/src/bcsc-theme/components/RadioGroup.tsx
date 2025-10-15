import { ThemedText, useTheme } from '@bifold/core'
import React from 'react'
import { StyleSheet, View, ViewStyle } from 'react-native'
import { RadioButton } from './RadioButton'

export interface RadioOption {
  label: string
  value: string
  disabled?: boolean
}

export interface RadioGroupProps {
  options: RadioOption[]
  selectedValue?: string
  onValueChange: (value: string) => void
  title?: string
  disabled?: boolean
  testID?: string
  style?: ViewStyle
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  options,
  selectedValue,
  onValueChange,
  title,
  disabled = false,
  testID,
  style = {},
}) => {
  const { ColorPalette, TextTheme, Spacing } = useTheme()

  const styles = StyleSheet.create({
    titleContainer: {
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.xs,
    },
    title: {
      ...TextTheme.labelSubtitle,
      color: disabled ? ColorPalette.grayscale.mediumGrey : ColorPalette.grayscale.black,
      fontWeight: '600',
    },
    optionsContainer: {
      paddingBottom: Spacing.xs,
    },
    separator: {
      height: Spacing.sm,
    },
  })

  return (
    <View testID={testID} style={style}>
      {title && (
        <View style={styles.titleContainer}>
          <ThemedText style={styles.title}>{title}</ThemedText>
        </View>
      )}
      <View style={styles.optionsContainer}>
        {options.map((option, index) => (
          <React.Fragment key={option.value}>
            {index > 0 && <View style={styles.separator} />}
            <RadioButton
              label={option.label}
              value={option.value}
              selected={selectedValue === option.value}
              onPress={onValueChange}
              disabled={disabled || option.disabled}
              testID={`${testID || 'radioGroup'}-option-${option.value}`}
            />
          </React.Fragment>
        ))}
      </View>
    </View>
  )
}
