import { testIdWithKey } from '@hyperledger/aries-bifold-core'
import React, { useEffect, useRef } from 'react'
import { View, StyleSheet, Animated } from 'react-native'

import ActivityIndicator from '../assets/img/activity-indicator-circle.svg'

const timing: Animated.TimingAnimationConfig = {
  toValue: 1,
  duration: 2000,
  useNativeDriver: true,
}

const Spinner = () => {
  const rotationAnim = useRef(new Animated.Value(0))
  const rotation = rotationAnim.current.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })
  const style = StyleSheet.create({
    animation: {
      position: 'absolute',
    },
  })
  const imageDisplayOptions = {
    height: 85,
    width: 85,
  }

  useEffect(() => {
    Animated.loop(Animated.timing(rotationAnim.current, timing)).start()
  }, [rotationAnim])

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }} testID={testIdWithKey('LoadingActivityIndicator')}>
      <Animated.View style={[style.animation, { transform: [{ rotate: rotation }] }]}>
        <ActivityIndicator {...imageDisplayOptions} />
      </Animated.View>
    </View>
  )
}

export default Spinner
