/**
 * Replaces regular spaces with non-breaking spaces (\u00A0) so that
 * iOS Voice Control and Android Voice Access display the full label
 * text in their overlays instead of truncating at word boundaries.
 */
export const a11yLabel = (label?: string | null): string => label?.replace(/ /g, '\u00A0') ?? ''

/**
 * Truncates a label to the first N words for use as an accessibility
 * label when the full text is too long (e.g., API-provided descriptions).
 * Applies a11yLabel() to the result.
 */
export const a11yShortLabel = (label?: string | null, maxWords = 3): string =>
  a11yLabel(label?.split(' ').slice(0, maxWords).join(' ') ?? '')
