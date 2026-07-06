import { WALLET_LEARN_MORE_URL } from '@/constants'
import { openLink } from '@/utils/links'
import EmptyWalletIllustration from '@assets/img/bcsc-empty-wallet.svg'
import { testIdWithKey, ThemedText, TOKENS, useServices, useTheme } from '@bifold/core'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useHeaderHeight } from '@react-navigation/elements'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, useWindowDimensions, View } from 'react-native'

import { CardButton } from './CardButton'

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
 * localized heading, plus a "Learn more about the wallet" link that opens an
 * external page. (Faux-credential / "Try the showcase" CTA tracked under #3737.)
 */
const EmptyWalletList: React.FC = () => {
  const { Spacing, ColorPalette } = useTheme()
  const { t } = useTranslation()
  const { height } = useWindowDimensions()
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  // Bifold's credential FlatList renders this empty component without a growing
  // content container, so `flex: 1` collapses to content height. Size it to the
  // viewport between the header and tab bar so the illustration + heading center.
  const minHeight = Math.max(0, height - headerHeight - tabBarHeight)

  const handleLearnMore = async () => {
    try {
      await openLink(WALLET_LEARN_MORE_URL)
    } catch (error) {
      logger.error(
        '[EmptyWalletList] Failed to open learn-more URL',
        error instanceof Error ? error : new Error(String(error))
      )
    }
  }

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
      <View style={{ alignSelf: 'stretch', marginTop: Spacing.lg }}>
        <CardButton
          title={t('BCSC.Wallet.EmptyLearnMore')}
          endIcon="open-in-new"
          onPress={handleLearnMore}
          testID={testIdWithKey('Wallet.EmptyLearnMore')}
        />
      </View>
    </View>
  )
}

export default EmptyWalletList
