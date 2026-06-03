import { hitSlop } from '@/constants'
import { testIdWithKey, useTheme } from '@bifold/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'

import useFloatingScanButtonViewModel from './useFloatingScanButtonViewModel'

const FAB_SIZE = 64
const ICON_SIZE = 42

interface FloatingScanButtonProps {
  /**
   * Active tab route name. The FAB hides itself when this is not Home or Wallet.
   */
  activeTabName: string | undefined
  /**
   * Integration point. Wire this to whatever scan flow the consumer wants
   * (e.g. navigation to Bifold's Scan screen).
   */
  onPress: () => void
}

const FloatingScanButton: React.FC<FloatingScanButtonProps> = ({ activeTabName, onPress }) => {
  const { t } = useTranslation()
  const { ColorPalette, Spacing } = useTheme()
  const { isVisible } = useFloatingScanButtonViewModel(activeTabName)

  const styles = StyleSheet.create({
    button: {
      width: FAB_SIZE,
      height: FAB_SIZE,
      borderRadius: Spacing.md,
      // TODO (bm): so far this is a one-off usage of this colour, eventually it should be added to the new theme
      backgroundColor: '#F1F8FE',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: ColorPalette.grayscale.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 6,
      marginBottom: Spacing.lg,
    },
    pressed: {
      opacity: 0.8,
    },
  })

  if (!isVisible) {
    return null
  }

  return (
    <Pressable
      accessibilityLabel={t('AddCredentialSlider.ScanQRCode')}
      accessibilityRole="button"
      hitSlop={{ ...hitSlop, bottom: 0 }}
      testID={testIdWithKey('FloatingScanButton')}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Icon name="qr-code-scanner" size={ICON_SIZE} color={ColorPalette.brand.primary} />
    </Pressable>
  )
}

export default FloatingScanButton
