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
      // Note: Writing the style like this prevents having to update all Pressable related snapshots
      style={(state) => {
        const style = typeof props.style === 'function' ? props.style(state) : props.style

        if (!state.pressed) {
          return style
        }

        return [style, { opacity: 0.2 }] // Mimics the default opacity from TouchableOpacity
      }}
    />
  )
}
