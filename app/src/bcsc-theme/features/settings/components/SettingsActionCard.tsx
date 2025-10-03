import { ThemedText, useTheme } from '@bifold/core'
import { ReactNode } from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'

interface SettingsActionCardProps {
  title: string
  onPress?: () => void // TODO (MD): make this required when all cards have actions
  startAdornment?: ReactNode
  endAdornment?: ReactNode
}

/**
 * A card component used in the settings screen to represent an action the user can take.
 *
 * @returns {*  } {JSX.Element}
 */
export const SettingsActionCard = (props: SettingsActionCardProps) => {
  const { Spacing, ColorPalette } = useTheme()

  const styles = StyleSheet.create({
    cardContainer: {
      height: 56,
      justifyContent: 'center',
      padding: Spacing.md,
      backgroundColor: ColorPalette.brand.secondaryBackground,
    },
    textContainer: {
      display: 'flex',
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    endAdornment: {
      marginLeft: 'auto',
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
        {props.endAdornment ? <View style={styles.endAdornment}>{props.endAdornment}</View> : null}
      </View>
    </TouchableOpacity>
  )
}
