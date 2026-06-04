import EmptyWalletIllustration from '@assets/img/bcsc-empty-wallet.svg'
import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    textAlign: 'center',
  },
})

/**
 * BCSC empty state for the Wallet tab. Replaces Bifold's BC-Wallet-branded
 * EmptyList in BCSC mode. Shows the style-guide wallet illustration above a
 * localized heading. (Faux-credential / "Try the showcase" CTA tracked under #3737.)
 */
// Approximate combined height (dp) of the app header + bottom tab bar, which the
// safe-area insets don't account for.
const HEADER_AND_TAB_BAR = 120

const EmptyWalletList: React.FC = () => {
  const { Spacing, ColorPalette } = useTheme()
  const { t } = useTranslation()
  const { height } = useWindowDimensions()
  const { top, bottom } = useSafeAreaInsets()

  // Bifold's credential FlatList renders this empty component without a growing
  // content container, so `flex: 1` collapses to content height. Size it to the
  // visible viewport so the illustration + heading center vertically.
  const minHeight = Math.max(0, height - top - bottom - HEADER_AND_TAB_BAR)

  return (
    <View style={[styles.container, { padding: Spacing.lg, minHeight }]} testID={testIdWithKey('Wallet.Empty')}>
      <EmptyWalletIllustration
        width={184}
        height={167}
        style={{ marginBottom: Spacing.lg }}
        testID={testIdWithKey('Wallet.EmptyIllustration')}
      />
      <ThemedText variant="headingThree" style={[styles.message, { color: ColorPalette.brand.primary }]}>
        {t('BCSC.Wallet.EmptyMessage')}
      </ThemedText>
    </View>
  )
}

export default EmptyWalletList
