import { BCState } from '@/store'
import { ThemedText, useStore, useTheme } from '@bifold/core'
import React from 'react'
import { StyleSheet, View } from 'react-native'

const TRIANGLE_SIZE = 90
const DIAGONAL = 1.414 // sqrt(2)
const HALF_DIAGONAL = DIAGONAL / 2

const NonProdOverlay: React.FC = () => {
  const [store] = useStore<BCState>()
  const { Spacing } = useTheme()
  const envName = store.developer.environment.name.split(' ')[0].toUpperCase()

  const isProd = envName.includes('PROD') && !envName.includes('PREPROD')

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: TRIANGLE_SIZE,
      height: TRIANGLE_SIZE,
      overflow: 'hidden',
    },
    triangle: {
      position: 'absolute',
      width: TRIANGLE_SIZE * DIAGONAL,
      height: TRIANGLE_SIZE * DIAGONAL,
      bottom: -TRIANGLE_SIZE * HALF_DIAGONAL,
      right: -TRIANGLE_SIZE * HALF_DIAGONAL,
      backgroundColor: '#aeaeae49',
      transform: [{ rotate: '45deg' }],
    },
    text: {
      position: 'absolute',
      fontWeight: 'bold',
      fontSize: 14,
      width: TRIANGLE_SIZE,
      top: TRIANGLE_SIZE / DIAGONAL - Spacing.md,
      right: TRIANGLE_SIZE / DIAGONAL,
      textAlign: 'center',
      transform: [{ rotate: '-90deg' }],
    },
  })

  if (isProd) {
    return null
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.triangle}>
        <ThemedText style={styles.text} maxFontSizeMultiplier={1}>
          {envName}
        </ThemedText>
      </View>
    </View>
  )
}

export default NonProdOverlay
