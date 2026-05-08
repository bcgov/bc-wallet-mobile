import { ThemedText, useTheme } from '@bifold/core'
import React from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const TransferAgeRestrictionScreen: React.FC = () => {
  const { Spacing } = useTheme()

  const styles = StyleSheet.create({
    container: {
      padding: Spacing.md,
      flex: 1,
    },
    scrollView: {
      flexGrow: 1,
      gap: Spacing.md,
    },
  })

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <ThemedText variant={'headingTwo'}>Not available</ThemedText>
        <ThemedText>You must be 12 years or older to transfer your account to another device</ThemedText>
      </ScrollView>
    </SafeAreaView>
  )
}

export default TransferAgeRestrictionScreen
