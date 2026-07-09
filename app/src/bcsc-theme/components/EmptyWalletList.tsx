import { PressableOpacity } from '@/components/PressableOpacity'
import { hitSlop, WALLET_LEARN_MORE_URL } from '@/constants'
import { openLink } from '@/utils/links'
import EmptyWalletIllustration from '@assets/img/bcsc-empty-wallet.svg'
import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useHeaderHeight } from '@react-navigation/elements'
import { a11yLabel } from '@utils/accessibility'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'

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
 * localized heading, plus a "Learn more about the wallet" tile that opens an
 * external page. The tile is a purpose-built PressableOpacity (not the shared
 * CardButton) so its text can match the Figma design's regular-weight 18px
 * typography instead of CardButton's bold headingFour style. (Faux-credential
 * / "Try the showcase" CTA tracked under #3737.)
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

  const handleLearnMore = () => {
    openLink(WALLET_LEARN_MORE_URL)
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
      <PressableOpacity
        accessible
        accessibilityRole="button"
        accessibilityLabel={a11yLabel(t('BCSC.Wallet.EmptyLearnMore'))}
        hitSlop={hitSlop}
        onPress={handleLearnMore}
        testID={testIdWithKey('Wallet.EmptyLearnMore')}
        style={{
          alignSelf: 'stretch',
          marginTop: Spacing.lg,
          minHeight: 57,
          backgroundColor: ColorPalette.brand.tertiaryBackground,
          borderRadius: Spacing.xs,
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.sm,
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
        }}
      >
        <ThemedText variant="normal" style={{ flex: 1, fontSize: 18, color: ColorPalette.brand.primary }}>
          {t('BCSC.Wallet.EmptyLearnMore')}
        </ThemedText>
        <Icon name="open-in-new" size={24} color={ColorPalette.brand.primary} />
      </PressableOpacity>
    </View>
  )
}

export default EmptyWalletList
