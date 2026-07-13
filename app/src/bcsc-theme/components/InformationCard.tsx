import { ThemedText, useTheme } from '@bifold/core'
import { StyleSheet, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

const ICON_SIZE = 24

interface InformationCardProps {
  /**
   * Title text to display at the top of the card
   *
   * @example "Card Title"
   * @type {string}
   */
  title: string
  /**
   * Subtext to display below the title
   *
   * @example "This is a subtext"
   * @type {string}
   */
  subtext: string
  /**
   * MaterialIcon compatible icon name shown to the left of the title
   *
   * @example "fingerprint", "dialpad"
   * @type {string}
   */
  startIcon?: string
}

/**
 * A reusable information card component that displays a title, optional subtext, and an optional icon.
 *
 * @param props - The InformationCard component props
 * @returns The InformationCard component
 */
export const InformationCard = (props: InformationCardProps) => {
  const { Spacing, ColorPalette } = useTheme()

  const styles = StyleSheet.create({
    container: {
      display: 'flex',
      backgroundColor: ColorPalette.brand.tertiaryBackground,
      padding: Spacing.md,
      borderRadius: Spacing.xs,
    },
    headerContainer: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    title: {
      fontSize: 14,
      fontWeight: 'bold',
      color: ColorPalette.brand.headerText,
    },
    subtext: {
      fontSize: 12,
      marginLeft: props.startIcon ? ICON_SIZE + Spacing.sm : undefined, // Add left margin to align with title when icon is present
      lineHeight: 18,
    },
  })

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        {props.startIcon && <Icon name={props.startIcon} size={ICON_SIZE} color={ColorPalette.brand.headerText} />}
        <ThemedText style={styles.title}>{props.title}</ThemedText>
      </View>
      <ThemedText style={styles.subtext}>{props.subtext}</ThemedText>
    </View>
  )
}
