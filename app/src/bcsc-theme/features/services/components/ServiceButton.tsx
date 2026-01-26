import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import React from 'react'
import { StyleSheet, TouchableOpacity } from 'react-native'

interface ServiceButtonProps {
  title: string
  description?: string
  onPress: () => void
  testID?: string
}

const ServiceButton: React.FC<ServiceButtonProps> = ({ title, description, onPress, testID }) => {
  const { ColorPalette, Spacing } = useTheme()

  const styles = StyleSheet.create({
    container: {
      padding: Spacing.md,
      backgroundColor: ColorPalette.brand.secondaryBackground,
    },
    title: {
      marginBottom: Spacing.sm,
      color: ColorPalette.brand.primary,
    },
  })

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.container}
      accessibilityLabel={title}
      accessibilityRole="button"
      testID={testID ?? testIdWithKey(`ServiceButton-${title}`)}
    >
      <ThemedText variant={'headingFour'} style={styles.title}>
        {title}
      </ThemedText>
      {description ? <ThemedText style={{ color: ColorPalette.brand.tertiary }}>{description}</ThemedText> : null}
    </TouchableOpacity>
  )
}

export default ServiceButton
