import { SKELETON_FILL_COLOR } from '@bcwallet-theme/theme'
import { useTheme } from '@bifold/core'
import React, { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Animated, DimensionValue, Easing, StyleSheet, useWindowDimensions, View } from 'react-native'

const PULSE_DURATION_MS = 2000
const PULSE_MIN_OPACITY = 0.4

// Bifold's ListCredentials gives every card this margin on its sides and above it.
const LIST_ITEM_MARGIN = 15
const CARD_RADIUS = 10
const LOGO_RADIUS = 8
const LABEL_BAR_HEIGHT = 19
const VALUE_BAR_HEIGHT = 24

// Style guide shadow: 16% black with a 6pt blur. The card's has no offset, the logo tile's drops 3pt.
// Android can only approximate it with an elevation.
const SHADOW_OPACITY = 0.16
const SHADOW_RADIUS = 3
const LOGO_SHADOW_OFFSET_Y = 3
const SHADOW_ELEVATION = 3

// Not `value`: Reanimated's Babel plugin warns about any `.value` read inside an inline style.
type SkeletonRow = { id: string; labelWidth: DimensionValue; valueWidth: DimensionValue }

// The style guide's two example cards. Bar widths are a share of the card's text column.
const SKELETON_CARDS: { id: string; rows: SkeletonRow[] }[] = [
  {
    id: 'detailed',
    rows: [
      { id: 'name', labelWidth: '60%', valueWidth: '100%' },
      { id: 'first-attribute', labelWidth: '44%', valueWidth: '60%' },
      { id: 'second-attribute', labelWidth: '37%', valueWidth: '84%' },
    ],
  },
  {
    id: 'compact',
    rows: [{ id: 'name', labelWidth: '60%', valueWidth: '100%' }],
  },
]

/**
 * The frame of a credential card on a screen of the given width. These are the sizes Bifold's card
 * uses (`useCredentialCardStyles` in `@bifold/core`'s `credential-card-styles.ts`, which the package
 * does not export), so the skeleton's cards line up with the real ones.
 *
 * @param windowWidth - Width of the window the card is drawn in.
 * @returns The card's padding, the side of its logo tile (also the stripe's width) and its minimum height.
 */
export const getCredentialCardFrame = (windowWidth: number) => ({
  padding: windowWidth * 0.05,
  logoSize: windowWidth * 0.12,
  minHeight: windowWidth * 0.33,
})

interface CredentialListSkeletonProps {
  testID?: string
  /** Pass `false` while the skeleton is hidden (an unfocused tab) to stop the pulse. */
  active?: boolean
}

/**
 * The Wallet tab's loading state: the style guide's skeleton of two credential cards. The card frame
 * matches the real cards; the grey fills inside it pulse while `active`.
 */
const CredentialListSkeleton: React.FC<CredentialListSkeletonProps> = ({ testID, active = true }) => {
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()
  const { width } = useWindowDimensions()
  const { padding, logoSize, minHeight } = getCredentialCardFrame(width)
  const phase = useRef(new Animated.Value(0)).current

  const fillOpacity = phase.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, PULSE_MIN_OPACITY, 1],
  })

  useEffect(() => {
    if (!active) {
      return
    }
    // A single looped timing runs entirely on the native driver. A looped sequence (fade out, fade in)
    // restarts from JavaScript every cycle, and would stall while the agent's start-up holds that thread.
    const animation = Animated.loop(
      Animated.timing(phase, {
        toValue: 1,
        duration: PULSE_DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: true,
        isInteraction: false,
      })
    )

    // Restart from the top; otherwise the native loop runs from wherever the last stop left `phase`.
    phase.setValue(0)
    animation.start()

    return () => animation.stop()
  }, [active, phase])

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    // No `overflow: 'hidden'`: it would clip the card's shadow and the logo tile's.
    card: {
      marginHorizontal: LIST_ITEM_MARGIN,
      marginTop: LIST_ITEM_MARGIN,
      borderRadius: CARD_RADIUS,
      backgroundColor: ColorPalette.grayscale.white,
      shadowColor: ColorPalette.grayscale.black,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: SHADOW_OPACITY,
      shadowRadius: SHADOW_RADIUS,
      elevation: SHADOW_ELEVATION,
    },
    // The only animated layer. It holds nothing but the grey fills, so the card and the logo tile stay
    // solid: an elevated view that fades shows its own shadow through itself on Android.
    fills: {
      flexDirection: 'row',
      minHeight,
    },
    stripe: {
      width: logoSize,
      borderTopLeftRadius: CARD_RADIUS,
      borderBottomLeftRadius: CARD_RADIUS,
      backgroundColor: SKELETON_FILL_COLOR,
    },
    // Starts `Spacing.sm` right of the logo tile, which overhangs the stripe by `padding`.
    rows: {
      flex: 1,
      marginLeft: padding + Spacing.sm,
      paddingVertical: padding,
      paddingRight: padding,
      gap: Spacing.md,
    },
    row: {
      gap: Spacing.xs,
    },
    labelBar: {
      height: LABEL_BAR_HEIGHT,
      backgroundColor: SKELETON_FILL_COLOR,
    },
    valueBar: {
      height: VALUE_BAR_HEIGHT,
      backgroundColor: SKELETON_FILL_COLOR,
    },
    logoTile: {
      position: 'absolute',
      top: padding,
      left: padding,
      width: logoSize,
      height: logoSize,
      borderRadius: LOGO_RADIUS,
      backgroundColor: ColorPalette.grayscale.white,
      shadowColor: ColorPalette.grayscale.black,
      shadowOffset: { width: 0, height: LOGO_SHADOW_OFFSET_Y },
      shadowOpacity: SHADOW_OPACITY,
      shadowRadius: SHADOW_RADIUS,
      elevation: SHADOW_ELEVATION,
    },
  })

  return (
    <View
      style={styles.container}
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('Global.Loading')}
      accessibilityState={{ busy: true }}
    >
      <View accessible={false} importantForAccessibility="no-hide-descendants">
        {SKELETON_CARDS.map((card) => (
          <View key={card.id} style={styles.card}>
            <Animated.View style={[styles.fills, { opacity: fillOpacity }]}>
              <View style={styles.stripe} />
              <View style={styles.rows}>
                {card.rows.map((row) => (
                  <View key={row.id} style={styles.row}>
                    <View style={[styles.labelBar, { width: row.labelWidth }]} />
                    <View style={[styles.valueBar, { width: row.valueWidth }]} />
                  </View>
                ))}
              </View>
            </Animated.View>
            <View style={styles.logoTile} />
          </View>
        ))}
      </View>
    </View>
  )
}

export default CredentialListSkeleton
