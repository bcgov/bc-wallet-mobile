import React from 'react'
import { StyleSheet, TouchableOpacity } from 'react-native'
import { ThemedText, useTheme } from '@bifold/core'

interface ServiceButtonProps {
  title: string
  description?: string
  onPress: () => void
}

const ServiceButton: React.FC<ServiceButtonProps> = ({ title, description, onPress }) => {
  const { ColorPalette, Spacing } = useTheme()

  const styles = StyleSheet.create({
    container: {
      padding: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: ColorPalette.brand.primaryBackground,
      backgroundColor: ColorPalette.brand.secondaryBackground,
    },
    title: {
      marginBottom: Spacing.sm,
      color: ColorPalette.brand.primary,
    },
  })

  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      <ThemedText variant={'headingFour'} style={styles.title}>
        {title}
      </ThemedText>
      <ThemedText style={{ color: ColorPalette.brand.tertiary }}>{description}</ThemedText>
    </TouchableOpacity>
  )
}

export default ServiceButton
