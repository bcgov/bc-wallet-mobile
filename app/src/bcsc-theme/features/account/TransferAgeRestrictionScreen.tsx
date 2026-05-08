import { ThemedText, useTheme } from '@bifold/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const TransferAgeRestrictionScreen: React.FC = () => {
  const { Spacing } = useTheme()
  const { t } = useTranslation()

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
        <ThemedText variant={'headingTwo'}>{t('BCSC.AgeRestrictedTransfer.Title')}</ThemedText>
        <ThemedText>{t('BCSC.AgeRestrictedTransfer.Description')}</ThemedText>
      </ScrollView>
    </SafeAreaView>
  )
}

export default TransferAgeRestrictionScreen
