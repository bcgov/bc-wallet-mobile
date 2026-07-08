import { usePreventDoublePress } from '@bifold/core'
import { useRef, useState } from 'react'
import { Animated, Easing, Pressable } from 'react-native'

const ANIMATE_PRESS_IN_MS = 100
const ANIMATE_PRESS_OUT_MS = 150
const OPACITY_MINIMUM_VALUE = 0.2
const OPACITY_MAXIMUM_VALUE = 1

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

/**
 * A wrapper around Pressable that mimics the opacity change of TouchableOpacity when pressed.
 *
 * @param props - The props for the Pressable component
 * @returns A Pressable component that changes opacity when pressed, similar to TouchableOpacity
 */
export const PressableOpacity = (props: React.ComponentProps<typeof Pressable>) => {
  const animatedOpacity = useRef(new Animated.Value(1)).current
  const { preventDoublePress } = usePreventDoublePress()
  const [pressed, setPressed] = useState(false)

  const setOpacityTo = (toValue: number, duration: number) => {
    Animated.timing(animatedOpacity, {
      toValue,
      duration,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start()
  }

  // Animated components have a slightly different style type than normal components
  const resolvedStyle = typeof props.style === 'function' ? props.style({ pressed }) : props.style

  return (
    <AnimatedPressable
      {...props}
      style={[resolvedStyle, { opacity: animatedOpacity }]}
      onPress={preventDoublePress(props.onPress)}
      onPressIn={(event) => {
        setPressed(true)
        setOpacityTo(OPACITY_MINIMUM_VALUE, ANIMATE_PRESS_IN_MS)
        props.onPressIn?.(event)
      }}
      onPressOut={(event) => {
        setPressed(false)
        setOpacityTo(OPACITY_MAXIMUM_VALUE, ANIMATE_PRESS_OUT_MS)
        props.onPressOut?.(event)
      }}
    />
  )
}
