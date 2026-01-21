import { ThemedText, useTheme } from '@bifold/core'
import { ReactNode } from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'

interface SettingsActionCardProps {
  title: string
  onPress: () => void
  startAdornment?: ReactNode
  endAdornmentText?: string
}

/**
 * A card component used in the settings screen to represent an action the user can take.
 *
 * @returns {*} {React.ReactElement}
 */
export const SettingsActionCard = (props: SettingsActionCardProps) => {
  const { Spacing, ColorPalette } = useTheme()

  const styles = StyleSheet.create({
    cardContainer: {
      height: 'auto',
      justifyContent: 'center',
      padding: Spacing.md,
      backgroundColor: ColorPalette.brand.secondaryBackground,
    },
    textContainer: {
      display: 'flex',
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    endAdornmentText: {
      marginLeft: 'auto',
      fontWeight: 'bold',
      color: ColorPalette.brand.primary,
    },
  })

  return (
    <TouchableOpacity
      style={styles.cardContainer}
      onPress={props.onPress}
      accessibilityRole="button"
      accessibilityLabel={props.title}
    >
      <View style={styles.textContainer}>
        {props.startAdornment ? props.startAdornment : null}
        <ThemedText>{props.title}</ThemedText>
        {props.endAdornmentText ? (
          <ThemedText style={styles.endAdornmentText}>{props.endAdornmentText}</ThemedText>
        ) : null}
      </View>
    </TouchableOpacity>
  )
}
