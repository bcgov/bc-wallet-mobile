import { Button, ButtonType, testIdWithKey, useAnimatedComponents, useTheme } from '@bifold/core'
import React, { useState } from 'react'
import { Image, StyleSheet, View } from 'react-native'

type PhotoReviewProps = {
  photoPath: string
  onAccept: () => Promise<void>
  onRetake: () => void
}

const PhotoReview: React.FC<PhotoReviewProps> = ({ photoPath, onAccept, onRetake }) => {
  const { ColorPalette, Spacing } = useTheme()
  const [loading, setLoading] = useState(false)
  const { ButtonLoading } = useAnimatedComponents()

  const styles = StyleSheet.create({
    contentContainer: {
      flexGrow: 1,
    },
    controlsContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: Spacing.md,
      backgroundColor: ColorPalette.notification.popupOverlay,
    },
    secondButton: {
      marginTop: Spacing.sm,
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
      <View style={styles.controlsContainer}>
        <Button
          buttonType={ButtonType.Primary}
          onPress={handleAccept}
          testID={testIdWithKey(`UsePhoto`)}
          title={'Use this photo'}
          accessibilityLabel={'Use this photo'}
          disabled={loading}
        >
          {loading && <ButtonLoading />}
        </Button>
        <View style={styles.secondButton}>
          <Button
            buttonType={ButtonType.Tertiary}
            onPress={onRetake}
            testID={testIdWithKey(`RetakePhoto`)}
            title={'Retake photo'}
            accessibilityLabel={'Retake photo'}
          />
        </View>
      </View>
    </View>
  )
}

export default PhotoReview
