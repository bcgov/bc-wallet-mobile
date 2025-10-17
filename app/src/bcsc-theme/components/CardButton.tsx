import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'

interface CardProps {
  /**
   * Title text to display at the top of the card
   *
   * @example "Card Title"
   * @type {string}
   */
  title: string
  /**
   * Function to be called when the card is pressed
   *
   * @type {() => void}
   */
  onPress: () => void
  /**
   * Optional subtext to display below the title
   *
   * @example "This is a subtext"
   * @type {string}
   */
  subtext?: string
  /**
   * MaterialIcon compatible icon name
   *
   * @example "arrow-forward", "open-in-new"
   * @type {string}
   */
  endIcon?: string
}

/**
 * A customizable card button component with title, optional subtext, and an optional end icon.
 *
 * @param {CardProps} props - Props for the CardButton component
 * @returns {*} {JSX.Element} The rendered CardButton component
 */
export const CardButton = (props: CardProps): JSX.Element => {
  const theme = useTheme()

  const styles = StyleSheet.create({
    cardContainer: {
      padding: theme.Spacing.md,
      backgroundColor: theme.ColorPalette.brand.secondaryBackground,
      borderWidth: 1,
      borderColor: theme.ColorPalette.brand.primaryLight,
      borderRadius: theme.Spacing.xs,
    },
    cardContentContainer: {
      gap: theme.Spacing.sm,
    },
    cardTitleContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cardTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.ColorPalette.brand.primary,
    },
    cardIcon: {
      color: theme.ColorPalette.brand.primary,
    },
    cardSubtext: {
      fontSize: 18,
      lineHeight: 30,
    },
  })

  return (
    <TouchableOpacity
      style={styles.cardContainer}
      onPress={props.onPress}
      accessibilityLabel={props.title}
      accessibilityRole="button"
      testID={testIdWithKey(`CardButton-${props.title}`)}
    >
      <View style={styles.cardContentContainer}>
        <View style={styles.cardTitleContainer}>
          <ThemedText style={styles.cardTitle}>{props.title}</ThemedText>
          {props.endIcon ? <Icon name={props.endIcon} style={styles.cardIcon} size={theme.Spacing.xl} /> : null}
        </View>
        {props.subtext ? <ThemedText style={styles.cardSubtext}>{props.subtext}</ThemedText> : null}
      </View>
    </TouchableOpacity>
  )
}
