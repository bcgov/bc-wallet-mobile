import { hitSlop } from '@/constants'
import { testIdWithKey, useTheme } from '@bifold/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

import useFloatingScanButtonViewModel from './useFloatingScanButtonViewModel'

const FAB_SIZE = 56
const ICON_SIZE = 28

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
  const { ColorPalette } = useTheme()
  const { isVisible } = useFloatingScanButtonViewModel(activeTabName)

  const styles = StyleSheet.create({
    button: {
      width: FAB_SIZE,
      height: FAB_SIZE,
      borderRadius: FAB_SIZE / 2,
      backgroundColor: ColorPalette.brand.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: ColorPalette.grayscale.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 6,
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
      hitSlop={hitSlop}
      testID={testIdWithKey('FloatingScanButton')}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Icon name="qrcode-scan" size={ICON_SIZE} color={ColorPalette.brand.primaryBackground} />
    </Pressable>
  )
}

export default FloatingScanButton
