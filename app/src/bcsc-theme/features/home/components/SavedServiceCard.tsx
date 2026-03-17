import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import { Animated, StyleSheet, TouchableOpacity } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import Swipeable from 'react-native-gesture-handler/Swipeable'
import Icon from 'react-native-vector-icons/MaterialIcons'

interface SavedServiceCardProps {
  title: string
  onPress: () => void
  onRemove: () => void
}

/**
 * Renders the card for a saved service on the home screen.
 *
 * @param {SavedServiceCardProps} props - The props for the component.
 * @returns {*} {React.ReactElement} The rendered component.
 */
export const SavedServiceCard: React.FC<SavedServiceCardProps> = (props: SavedServiceCardProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()

  const styles = StyleSheet.create({
    serviceContainer: {
      marginBottom: Spacing.sm,
      backgroundColor: ColorPalette.brand.secondaryBackground,
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.md,
      justifyContent: 'center',
    },
    rightAction: {
      backgroundColor: ColorPalette.semantic.error,
      justifyContent: 'center',
      marginBottom: Spacing.sm,
      paddingHorizontal: Spacing.md,
    },
  })

  return (
    <GestureHandlerRootView>
      <Swipeable
        friction={1.5}
        renderRightActions={(_, dragX) => {
          const translateX = dragX.interpolate({
            inputRange: [-100, 1],
            outputRange: [0, 10],
            extrapolate: 'clamp',
          })

          return (
            <Animated.View style={[styles.rightAction, { transform: [{ translateX: translateX }] }]}>
              <TouchableOpacity
                onPress={props.onRemove}
                accessibilityLabel={`${t('BCSC.Services.Remove')} ${props.title}`}
                accessibilityRole="button"
                testID={testIdWithKey(`RemoveService-${props.title.replaceAll(/\s+/g, '')}`)}
              >
                <Icon name="delete" size={40} />
              </TouchableOpacity>
            </Animated.View>
          )
        }}
      >
        <TouchableOpacity
          delayPressIn={50}
          style={styles.serviceContainer}
          onPress={props.onPress}
          accessibilityLabel={`${t('BCSC.Services.Open')} ${props.title}`}
          accessibilityRole="button"
          testID={testIdWithKey(`OpenService-${props.title.replaceAll(/\s+/g, '')}`)}
        >
          <ThemedText>{props.title}</ThemedText>
        </TouchableOpacity>
      </Swipeable>
    </GestureHandlerRootView>
  )
}
