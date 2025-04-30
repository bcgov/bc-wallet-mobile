import { useTheme } from '@bifold/core'
import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View } from 'react-native'

import ActivityIndicator from '@assets/img/activity-indicator-circle.svg'
import EmptyWallet from '@assets/img/personCredLoadingIcon.svg'

const timing: Animated.TimingAnimationConfig = {
  toValue: 1,
  duration: 2000,
  useNativeDriver: true,
}

const PersonCredentialSpinner: React.FC = () => {
  const { ColorPallet } = useTheme()
  const rotationAnim = useRef(new Animated.Value(0))
  const rotation = rotationAnim.current.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })
  const style = StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    animation: {
      position: 'absolute',
      zIndex: 1,
    },
  })
  const displayOptions = {
    fill: ColorPallet.notification.infoText,
  }
  const animatedCircleDisplayOptions = {
    fill: ColorPallet.notification.infoText,
    height: 250,
    width: 250,
  }

  useEffect(() => {
    Animated.loop(Animated.timing(rotationAnim.current, timing)).start()
  }, [rotationAnim])

  return (
    <View style={style.container}>
      <EmptyWallet style={style.animation} {...displayOptions} />
      <Animated.View style={{ transform: [{ rotate: rotation }] }}>
        <ActivityIndicator {...animatedCircleDisplayOptions} />
      </Animated.View>
    </View>
  )
}

export default PersonCredentialSpinner
