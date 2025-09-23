import { ThemedText, useTheme } from '@bifold/core'
import { StyleSheet, TouchableOpacity } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import ReanimatedSwipable from 'react-native-gesture-handler/Swipeable'

interface SavedServiceCardProps {
  title: string
  onPress: () => void
  onRemove: () => void
}

/**
 * Renders the card for a saved service on the home screen.
 *
 * @param {SavedServiceCardProps} props - The props for the component.
 * @returns {*} {JSX.Element} The rendered component.
 */
export const SavedServiceCard: React.FC<SavedServiceCardProps> = (props: SavedServiceCardProps) => {
  const { ColorPalette, Spacing } = useTheme()

  const styles = StyleSheet.create({
    serviceContainer: {
      marginBottom: Spacing.sm,
      backgroundColor: ColorPalette.brand.secondaryBackground,
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.md,
      justifyContent: 'center',
    },
  })

  return (
    <GestureHandlerRootView>
      <ReanimatedSwipable
        friction={2}
        renderLeftActions={() => {
          props.onRemove()
        }}
      >
        <TouchableOpacity onPress={props.onPress} style={styles.serviceContainer}>
          <ThemedText>{props.title}</ThemedText>
        </TouchableOpacity>
      </ReanimatedSwipable>
    </GestureHandlerRootView>
  )
}
