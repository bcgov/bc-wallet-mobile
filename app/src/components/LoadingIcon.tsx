import React, { useEffect, useRef } from 'react'
import { Animated } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'

interface LoadingIconProps {
  size: number
  color: string
  active: boolean
}

const timing: Animated.TimingAnimationConfig = {
  toValue: 1,
  duration: 2000,
  useNativeDriver: true,
}

export default function LoadingIcon({ size, color, active }: Readonly<LoadingIconProps>) {
  const rotationAnim = useRef(new Animated.Value(0))
  const rotation = rotationAnim.current.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  const animation = Animated.loop(Animated.timing(rotationAnim.current, timing))

  useEffect(() => {
    animation.reset()
    if (active) {
      animation.start()
    } else {
      animation.stop()
    }
  }, [animation, active])

  return (
    <>
      <Animated.View style={{ transform: [{ rotate: rotation }] }}>
        <Icon style={{ color }} size={size} name="refresh" />
      </Animated.View>
    </>
  )
}
