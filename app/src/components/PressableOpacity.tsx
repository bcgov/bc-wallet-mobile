import { Pressable } from 'react-native'

/**
 * A wrapper around Pressable that mimics the opacity change of TouchableOpacity when pressed.
 *
 * @param props - The props for the Pressable component
 * @returns A Pressable component that changes opacity when pressed, similar to TouchableOpacity
 */
export const PressableOpacity = (props: React.ComponentProps<typeof Pressable>) => {
  return (
    <Pressable
      {...props}
      style={(state) => [
        typeof props.style === 'function' ? props.style(state) : props.style,
        state.pressed && {
          opacity: 0.2, // Mimics the default opacity from TouchableOpacity
        },
      ]}
    />
  )
}
