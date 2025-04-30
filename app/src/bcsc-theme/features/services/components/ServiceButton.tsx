import React from 'react'
import { StyleSheet, TouchableOpacity } from 'react-native'
import { ThemedText, useTheme } from '@bifold/core'

interface ServiceButtonProps {
  title: string
  description: string
  onPress: () => void
}

const ServiceButton: React.FC<ServiceButtonProps> = ({ title, description, onPress }) => {
  const { ColorPallet, Spacing } = useTheme()

  const styles = StyleSheet.create({
    container: {
      padding: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: ColorPallet.brand.primaryBackground,
      backgroundColor: ColorPallet.brand.secondaryBackground,
    },
    title: {
      marginBottom: Spacing.sm,
      color: ColorPallet.brand.primary,
    },
  })

  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      <ThemedText variant={'headingFour'} style={styles.title}>
        {title}
      </ThemedText>
      <ThemedText style={{ color: ColorPallet.brand.tertiary }}>{description}</ThemedText>
    </TouchableOpacity>
  )
}

export default ServiceButton
