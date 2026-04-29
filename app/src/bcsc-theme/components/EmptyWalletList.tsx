import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

/**
 * BCSC empty state for the Wallet tab. Replaces Bifold's BC-Wallet-branded
 * EmptyList in BCSC mode. Intentionally bare — design polish (illustration,
 * faux credential, DSC CTA) is tracked under #3737.
 */
const EmptyWalletList: React.FC = () => {
  const { Spacing } = useTheme()
  const { t } = useTranslation()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.lg,
    },
  })

  return (
    <View style={styles.container} testID={testIdWithKey('Wallet.Empty')}>
      <ThemedText>{t('BCSC.Wallet.EmptyMessage')}</ThemedText>
    </View>
  )
}

export default EmptyWalletList
