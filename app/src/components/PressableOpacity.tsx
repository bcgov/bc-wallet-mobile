import { useRef, useState } from 'react'
import { Animated, Easing, Pressable } from 'react-native'
import { SinglePressable } from './SinglePressable'

// https://github.com/react/react-native/blob/715eeaad69ad4b69dc5694fb5fba6dbde922ca06/packages/react-native/Libraries/Components/Touchable/TouchableOpacity.js#L149
const ANIMATE_PRESS_IN_MS = 100
// https://github.com/react/react-native/blob/715eeaad69ad4b69dc5694fb5fba6dbde922ca06/packages/react-native/Libraries/Components/Touchable/TouchableOpacity.js#L156
const ANIMATE_PRESS_OUT_MS = 250
const OPACITY_MINIMUM_VALUE = 0.2
const OPACITY_MAXIMUM_VALUE = 1

const AnimatedSinglePressable = Animated.createAnimatedComponent(SinglePressable)

/**
 * A wrapper around Pressable that mimics the opacity change of TouchableOpacity when pressed.
 *
 * @param props - The props for the Pressable component
 * @returns A Pressable component that changes opacity when pressed, similar to TouchableOpacity
 */
export const PressableOpacity = (props: React.ComponentProps<typeof Pressable>) => {
  const animatedOpacity = useRef(new Animated.Value(1)).current
  const [pressed, setPressed] = useState(false)

  const setOpacityTo = (toValue: number, duration: number) => {
    Animated.timing(animatedOpacity, {
      toValue,
      duration,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start()
  }

  /**
   * Resolve the style ourselves so we can hand AnimatedPressable a plain
   * array/object — createAnimatedComponent can't intercept function-styles.
   */
  const resolvedStyle = typeof props.style === 'function' ? props.style({ pressed }) : props.style

  return (
    <AnimatedSinglePressable
      {...props}
      style={[resolvedStyle, { opacity: animatedOpacity }]}
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
