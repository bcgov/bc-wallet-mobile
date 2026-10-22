import { TestIds } from '@/test-ids/registry'
import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

/**
 * Covers the camera preview while the camera session is interrupted, so a black or frozen
 * preview isn't mistaken for a broken camera. Touches pass through to the controls on top.
 */
const CameraInterruptedOverlay = () => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()

  const styles = StyleSheet.create({
    container: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    text: {
      color: ColorPalette.grayscale.white,
      textAlign: 'center',
    },
  })

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.container]}
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      testID={testIdWithKey(TestIds.shared.cameraInterrupted.overlay)}
    >
      <Icon name="camera-off" size={48} color={ColorPalette.grayscale.white} />
      <ThemedText variant="headingFour" style={styles.text} accessibilityRole="header">
        {t('BCSC.CameraDisclosure.CameraInterrupted')}
      </ThemedText>
      <ThemedText style={styles.text}>{t('BCSC.CameraDisclosure.CameraInterruptedMessage')}</ThemedText>
    </View>
  )
}

export default CameraInterruptedOverlay
