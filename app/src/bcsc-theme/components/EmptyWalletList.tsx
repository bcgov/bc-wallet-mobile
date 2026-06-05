import EmptyWalletIllustration from '@assets/img/bcsc-empty-wallet.svg'
import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useHeaderHeight } from '@react-navigation/elements'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, useWindowDimensions, View } from 'react-native'

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
const EmptyWalletList: React.FC = () => {
  const { Spacing, ColorPalette } = useTheme()
  const { t } = useTranslation()
  const { height } = useWindowDimensions()
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()

  // Bifold's credential FlatList renders this empty component without a growing
  // content container, so `flex: 1` collapses to content height. Size it to the
  // viewport between the header and tab bar so the illustration + heading center.
  const minHeight = Math.max(0, height - headerHeight - tabBarHeight)

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
