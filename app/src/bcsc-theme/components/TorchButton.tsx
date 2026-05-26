import { hitSlop } from '@/constants'
import { testIdWithKey, useTheme } from '@bifold/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TouchableOpacity } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'

interface TorchButtonProps {
  active: boolean
  onPress?: () => void
  /** Diameter of the circular button. @default 24 */
  size?: number
}

/**
 * Flashlight toggle for camera screens.
 */
const TorchButton: React.FC<TorchButtonProps> = ({ active, onPress, size = 24 }) => {
  const { t } = useTranslation()
  const { ColorPalette } = useTheme()

  const styles = StyleSheet.create({
    button: {
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center',
    },
  })

  return (
    <TouchableOpacity
      accessible
      accessibilityLabel={active ? t('BCSC.Scan.TorchOn') : t('BCSC.Scan.TorchOff')}
      accessibilityRole={'button'}
      testID={testIdWithKey('ScanTorch')}
      style={styles.button}
      onPress={onPress}
      hitSlop={hitSlop}
    >
      <Icon name={active ? 'flash-on' : 'flash-off'} color={ColorPalette.grayscale.white} size={size} />
    </TouchableOpacity>
  )
}

export default TorchButton
