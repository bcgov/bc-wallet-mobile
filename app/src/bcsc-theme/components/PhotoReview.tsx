import { Button, ButtonType, testIdWithKey, useAnimatedComponents, useTheme } from '@bifold/core'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Image, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type PhotoReviewProps = {
  photoPath: string
  onAccept: () => Promise<void>
  onRetake: () => void
}

const PhotoReview: React.FC<PhotoReviewProps> = ({ photoPath, onAccept, onRetake }) => {
  const { ColorPalette, Spacing } = useTheme()
  const [loading, setLoading] = useState(false)
  const { ButtonLoading } = useAnimatedComponents()
  const { t } = useTranslation()

  const styles = StyleSheet.create({
    contentContainer: {
      flexGrow: 1,
    },
    controlsContainer: {
      position: 'absolute',
      gap: Spacing.md,
      bottom: 0,
      left: 0,
      right: 0,
      padding: Spacing.md,
      backgroundColor: ColorPalette.notification.popupOverlay,
    },
  })

  const handleAccept = async () => {
    try {
      setLoading(true)
      await onAccept()
    } finally {
      setLoading(false)
    }
  }
  return (
    <View style={styles.contentContainer}>
      <Image source={{ uri: `file://${photoPath}` }} style={{ height: '100%', width: 'auto', resizeMode: 'cover' }} />
      <SafeAreaView style={styles.controlsContainer} edges={['bottom', 'left', 'right']}>
        <Button
          buttonType={ButtonType.Primary}
          onPress={handleAccept}
          testID={testIdWithKey(`UsePhoto`)}
          title={t('Unified.PhotoReview.UsePhoto')}
          accessibilityLabel={t('Unified.PhotoReview.UsePhoto')}
          disabled={loading}
        >
          {loading && <ButtonLoading />}
        </Button>
        <Button
          buttonType={ButtonType.Tertiary}
          onPress={onRetake}
          testID={testIdWithKey(`RetakePhoto`)}
          title={t('Unified.PhotoReview.RetakePhoto')}
          accessibilityLabel={t('Unified.PhotoReview.RetakePhoto')}
        />
      </SafeAreaView>
    </View>
  )
}

export default PhotoReview
