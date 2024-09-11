import { ColorPallet, useTheme } from '@hyperledger/aries-bifold-core'
import React, { useEffect, useState } from 'react'
import { StyleSheet, View, Animated, useWindowDimensions } from 'react-native'

import { TextTheme } from '../theme'

export interface ProgressBarProps {
  progressPercent: number
  color?: keyof (typeof ColorPallet)['brand']
}

const ProgressBar = ({ progressPercent, color }: ProgressBarProps) => {
  const { ColorPallet } = useTheme()
  const { width: windowWidth } = useWindowDimensions()
  const [progressBarScale] = useState(new Animated.Value(0))

  useEffect(() => {
    Animated.timing(progressBarScale, {
      toValue: progressPercent,
      duration: 300,
      useNativeDriver: true, // allows for much smoother animation
    }).start()
  }, [progressPercent])

  const styles = StyleSheet.create({
    progressBarContainer: {
      width: '100%',
      height: 11,
      backgroundColor: ColorPallet.brand.secondaryBackground,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      width: '100%',
      backgroundColor: color ? ColorPallet.brand[color] : TextTheme.title.color,
    },
  })
  // scaleX rather than width is used for the progress bar as this allows useNativeDriver to be true
  const scaleX = progressBarScale.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
  })
  const animatedBarStyle = {
    // without these two translates, the progress would start from the center and expand outward, rather than start from the left
    transform: [{ translateX: -(windowWidth / 2) }, { scaleX }, { translateX: windowWidth / 2 }],
  }

  return (
    <View style={styles.progressBarContainer}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.progressBar, animatedBarStyle]} />
    </View>
  )
}

export default ProgressBar
