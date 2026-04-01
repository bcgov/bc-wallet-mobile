import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import React from 'react'
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native'

import { a11yLabel } from '@utils/accessibility'

interface SectionButtonProps {
  title: string
  description?: string
  accessibilityLabel?: string
  style?: ViewStyle
  onPress?: () => void
  testID?: string
  disabled?: boolean
}

const SectionButton: React.FC<SectionButtonProps> = ({
  title,
  description,
  accessibilityLabel,
  style,
  onPress,
  testID,
  disabled,
}) => {
  const { ColorPalette, Spacing } = useTheme()

  const styles = StyleSheet.create({
    container: {
      backgroundColor: ColorPalette.brand.secondaryBackground,
      borderRadius: Spacing.sm,
      borderColor: ColorPalette.brand.tertiary,
      borderWidth: 1,
      padding: Spacing.md,
    },
    title: {
      color: ColorPalette.brand.primary,
    },
    description: {
      color: ColorPalette.brand.tertiary,
      marginTop: Spacing.sm,
    },
  })

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={a11yLabel(accessibilityLabel ?? title)}
      accessibilityRole="button"
      testID={testID ?? testIdWithKey(`SectionButton-${title.replaceAll(/\s+/g, '')}`)}
    >
      <ThemedText variant={'headingFour'} style={styles.title}>
        {title}
      </ThemedText>
      {description ? <ThemedText style={styles.description}>{description}</ThemedText> : null}
    </TouchableOpacity>
  )
}

export default SectionButton
