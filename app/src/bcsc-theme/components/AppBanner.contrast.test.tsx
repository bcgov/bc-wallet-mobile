import { testIdWithKey } from '@bifold/core'
import { render } from '@testing-library/react-native'
import React from 'react'
import { StyleSheet } from 'react-native'

import { AppBannerSection, BCSCBanner } from './AppBanner'

// AppBanner reads its colours from useTheme(). Rendered bare, that resolves to
// Bifold's built-in default theme rather than the theme the app actually ships,
// which is what let the original contrast bug through: the default theme's
// `secondaryBackground` happens to be dark, while the app's LightTheme sets it
// to white. BCSC builds boot on LightTheme (see `defaultThemeName` in App.tsx),
// so pin the real thing here.
jest.mock('@bifold/core', () => {
  const actual = jest.requireActual('@bifold/core')

  // Resolved lazily: '@/theme' pulls in '@bifold/core' itself, so requiring it
  // in the factory body would deadlock on the partially-initialised module.
  return { ...actual, useTheme: () => jest.requireActual('@/theme').LightTheme }
})

/**
 * WCAG 2.1 relative luminance and contrast ratio.
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
const relativeLuminance = (hex: string): number => {
  const channels = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)))

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const contrastRatio = (foreground: string, background: string): number => {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a)

  return (lighter + 0.05) / (darker + 0.05)
}

const colorOf = (element: { props: { style: unknown } }): string =>
  (StyleSheet.flatten(element.props.style as never) as { color: string }).color

// Matches the `warning` case of AppBanner's bannerColor()
const WARNING_BACKGROUND = '#F8BB47'

const WCAG_AA_TEXT = 4.5
const WCAG_AA_NON_TEXT = 3

describe('AppBannerSection contrast', () => {
  it('meets WCAG AA against the warning banner background', () => {
    const { getByTestId } = render(
      <AppBannerSection
        id={'A' as BCSCBanner}
        title="Warning title"
        description="Warning description"
        type="warning"
        dismissible={false}
      />
    )

    const titleColor = colorOf(getByTestId(testIdWithKey('text-warning')))
    const descriptionColor = colorOf(getByTestId(testIdWithKey('description-warning')))
    // The icon carries meaning here, so it needs the 3:1 non-text minimum.
    const iconColor = colorOf(getByTestId(testIdWithKey('icon-warning')))

    expect(contrastRatio(titleColor, WARNING_BACKGROUND)).toBeGreaterThanOrEqual(WCAG_AA_TEXT)
    expect(contrastRatio(descriptionColor, WARNING_BACKGROUND)).toBeGreaterThanOrEqual(WCAG_AA_TEXT)
    expect(contrastRatio(iconColor, WARNING_BACKGROUND)).toBeGreaterThanOrEqual(WCAG_AA_NON_TEXT)
  })

  it('sanity-checks the contrast helper', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 1)
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 1)
    // The colour the warning banner used to render: white on amber.
    expect(contrastRatio('#FFFFFF', WARNING_BACKGROUND)).toBeLessThan(WCAG_AA_NON_TEXT)
  })
})
