import { BCState } from '@/store'
import { ThemedText, useStore, useTheme } from '@bifold/core'
import React, { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { DebugStateModal } from './DebugStateModal'

const TRIANGLE_SIZE = 90
const DIAGONAL = 1.414 // sqrt(2)
const HALF_DIAGONAL = DIAGONAL / 2

const NonProdOverlay: React.FC = () => {
  const [store] = useStore<BCState>()
  const { Spacing } = useTheme()
  const [openDevModal, setOpenDevModal] = useState(false)
  const envName = store.developer.environment.name.split(' ')[0].toUpperCase()

  const isProd = envName.includes('PROD') && !envName.includes('PREPROD')

  const styles = StyleSheet.create({
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
    <>
      <Pressable
        onLongPress={() => setOpenDevModal(true)}
        delayLongPress={500}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        <View style={styles.triangle}>
          <ThemedText style={styles.text} maxFontSizeMultiplier={1}>
            {envName}
          </ThemedText>
        </View>
      </Pressable>

      <DebugStateModal state={store} open={openDevModal} onClose={() => setOpenDevModal(false)} />
    </>
  )
}

export default NonProdOverlay
