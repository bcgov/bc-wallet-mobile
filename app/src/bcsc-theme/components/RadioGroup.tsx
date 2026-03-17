import { testIdForAccessabilityLabel, useTheme } from '@bifold/core'
import React from 'react'
import { StyleSheet, View, ViewStyle } from 'react-native'
import { RadioButton } from './RadioButton'

interface RadioOption<T> {
  label: string
  value: T
  disabled?: boolean
}

interface RadioGroupProps<T> {
  options: RadioOption<T>[]
  selectedValue?: T
  onValueChange: (value: T) => void
  testID: string
  style?: ViewStyle
}

export const RadioGroup = <T,>({ options, selectedValue, onValueChange, testID, style = {} }: RadioGroupProps<T>) => {
  const { Spacing } = useTheme()

  const styles = StyleSheet.create({
    optionsContainer: {
      paddingBottom: Spacing.xs,
    },
    separator: {
      height: Spacing.sm,
    },
  })

  return (
    <View testID={testID} style={style}>
      <View style={styles.optionsContainer}>
        {options.map((option, index) => (
          <React.Fragment key={option.label}>
            {index > 0 && <View style={styles.separator} />}
            <RadioButton<T>
              label={option.label}
              value={option.value}
              selectedValue={selectedValue}
              onValueChange={onValueChange}
              disabled={option.disabled}
              testID={`${testID}-option-${testIdForAccessabilityLabel(option.label)}`}
            />
          </React.Fragment>
        ))}
      </View>
    </View>
  )
}
