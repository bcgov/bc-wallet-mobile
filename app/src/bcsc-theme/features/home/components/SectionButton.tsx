import { ThemedText, useTheme } from '@bifold/core'
import React from 'react'
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native'

interface SectionButtonProps {
  title: string
  description?: string
  style?: ViewStyle
  onPress?: () => void
}

const SectionButton: React.FC<SectionButtonProps> = ({ title, description, style, onPress }) => {
  const { ColorPallet, Spacing } = useTheme()

  const styles = StyleSheet.create({
    container: {
      backgroundColor: ColorPallet.brand.secondaryBackground,
      borderRadius: Spacing.sm,
      borderColor: ColorPallet.brand.tertiary,
      borderWidth: 1,
      padding: Spacing.md,
    },
    title: {
      color: ColorPallet.brand.primary,
    },
    description: {
      color: ColorPallet.brand.tertiary,
      marginTop: Spacing.sm,
    },
  })

  return (
    <TouchableOpacity style={[styles.container, style]} onPress={onPress}>
      <ThemedText variant={'headingFour'} style={styles.title}>
        {title}
      </ThemedText>
      {description ? <ThemedText style={styles.description}>{description}</ThemedText> : null}
    </TouchableOpacity>
  )
}

export default SectionButton
