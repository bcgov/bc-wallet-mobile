import React, { useEffect, useRef } from 'react'
import { Animated } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'

interface LoadingIconProps {
  size: number
  color: string
  active: boolean
}

export default function LoadingIcon({ size, color, active }: Readonly<LoadingIconProps>) {
  const rotationAnim = useRef(new Animated.Value(0)).current
  const timing: Animated.TimingAnimationConfig = {
    toValue: 1,
    duration: 2000,
    useNativeDriver: true,
  }
  const rotation = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  const animation = Animated.loop(Animated.timing(rotationAnim, timing))

  useEffect(() => {
    animation.reset()
    if (active) {
      animation.start()
    } else {
      animation.stop()
    }
  }, [rotationAnim, active])

  return (
    <>
      <Animated.View style={[{ transform: [{ rotate: rotation }] }]}>
        <Icon style={{ color }} size={size} name="refresh" />
      </Animated.View>
    </>
  )
}
