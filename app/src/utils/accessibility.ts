/**
 * Replaces regular spaces with non-breaking spaces (\u00A0) so that
 * iOS Voice Control and Android Voice Access display the full label
 * text in their overlays instead of truncating at word boundaries.
 */
export const a11yLabel = (label: string): string => label?.replace(/ /g, '\u00A0') ?? ''
