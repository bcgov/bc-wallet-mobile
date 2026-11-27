import { useInvertColorsEnabled } from '@/bcsc-theme/hooks/useInvertColorsEnabled'
import { TestIds } from '@/test-ids/registry'
import { testIdWithKey, ThemedText, TOKENS, useServices, useTheme } from '@bifold/core'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Platform, StyleSheet, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'

interface ScannableQRCodeProps {
  /** The text the code encodes. */
  value: string
  /** Side length of the whole card, the light border around the code (its quiet zone) included. */
  size: number
}

/**
 * A QR code drawn dark on a light card, and kept that way when the phone's colour inversion
 * setting is on. Inverted, the code reads light on dark and scanners don't pick it up (#4768).
 * Render every BCSC QR code with this rather than Bifold's `QRRenderer`.
 */
const ScannableQRCode: React.FC<ScannableQRCodeProps> = ({ value, size }) => {
  const { t } = useTranslation()
  const { ColorPalette, Spacing } = useTheme()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const isInvertColorsEnabled = useInvertColorsEnabled()
  // react-native-qrcode-svg reports a value it can't encode partway through its own render, when
  // this card's state can't change, so the failure is noted then and shown once the render is done.
  // Both are keyed to the value, so a new value (a refreshed code) is drawn rather than left failed.
  const encodeFailure = useRef<{ value: string; error: Error }>(undefined)
  const [failedValue, setFailedValue] = useState<string>()

  // Android inverts the whole display and lets no view opt out, so while inversion is on the card
  // is drawn inverted and the display turns it back. iOS needs no redraw: the card opts out of Smart
  // Invert below. Classic Invert inverts everything on screen, with no opt-out an app can use.
  const drawInverted = Platform.OS === 'android' && isInvertColorsEnabled
  const moduleColor = drawInverted ? ColorPalette.grayscale.white : ColorPalette.grayscale.black
  const cardColor = drawInverted ? ColorPalette.grayscale.black : ColorPalette.grayscale.white
  const quietZone = Spacing.md

  const styles = StyleSheet.create({
    card: {
      alignSelf: 'center',
      padding: quietZone,
      borderRadius: Spacing.sm,
      backgroundColor: cardColor,
    },
    errorMessage: {
      color: ColorPalette.semantic.error,
      textAlign: 'center',
    },
  })

  const onError = useCallback(
    (error: Error) => {
      encodeFailure.current = { value, error }
    },
    [value]
  )

  useEffect(() => {
    const failure = encodeFailure.current
    if (failure?.value === value && failedValue !== value) {
      logger.error('[ScannableQRCode] Could not generate the QR code', failure.error)
      setFailedValue(value)
    }
  }, [failedValue, logger, value])

  if (failedValue === value) {
    return <ThemedText style={styles.errorMessage}>{t('QRRender.GenerationError')}</ThemedText>
  }

  return (
    // The renderer flattens a view that only carries accessibilityIgnoresInvertColors out of the
    // native tree, taking the flag with it; collapsable={false} keeps the card a native view
    // whatever its style.
    <View
      style={styles.card}
      accessibilityIgnoresInvertColors
      collapsable={false}
      testID={testIdWithKey(TestIds.shared.scannableQRCode.card)}
    >
      <QRCode
        value={value}
        size={size - quietZone * 2}
        color={moduleColor}
        backgroundColor={cardColor}
        ecl="L"
        onError={onError}
      />
    </View>
  )
}

export default ScannableQRCode
