import { PressableOpacity } from '@/components/PressableOpacity'
import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { a11yLabel } from '@utils/accessibility'
import { StyleSheet, View } from 'react-native'
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
  onPress?: () => void
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
  /**
   * MaterialIcon compatible icon name shown to the left of the title/subtext, if provided
   * it will affect the sizing of the title and subtext
   *
   * @example "fingerprint", "dialpad"
   * @type {string}
   */
  startIcon?: string
  /**
   * Whether the button is disabled
   *
   * @type {boolean}
   */
  disabled?: boolean
  /**
   * Whether the card is shown in a selected/highlighted state (e.g. the current selection).
   * A selected card is a non-interactive status indicator: it renders an accent border with a
   * trailing check icon (not dimmed like a disabled card), announces its title and subtext together
   * with a "selected" state to screen readers, and does not respond to presses.
   *
   * @type {boolean}
   */
  selected?: boolean
  /**
   * Test ID for the button
   *
   * @type {string}
   */
  testID?: string
  /**
   * Accessibility hint for screen readers, describing what happens when the button is pressed
   *
   * @type {string}
   */
  accessibilityHint?: string
}

/**
 * A customizable card button component with title, optional subtext, and an optional end icon.
 *
 * @param {CardProps} props - Props for the CardButton component
 * @returns {*} {React.ReactElement} The rendered CardButton component
 */
export const CardButton = (props: CardProps): React.ReactElement => {
  const { TextTheme, Spacing, ColorPalette } = useTheme()

  const styles = StyleSheet.create({
    cardContainer: {
      padding: Spacing.md,
      backgroundColor: ColorPalette.brand.tertiaryBackground,
      borderRadius: Spacing.xs,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    cardContainerSelected: {
      borderColor: ColorPalette.brand.primary,
    },
    cardOuterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    cardContentContainer: {
      flex: 1,
      gap: Spacing.xs,
    },
    cardTitleContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cardIcon: {
      color: TextTheme.headingFour.color,
    },
    cardContainerDisabled: {
      opacity: 0.6,
    },
    cardTitle: {
      color: TextTheme.headingFour.color,
      fontSize: props.startIcon ? 16 : TextTheme.headingFour.fontSize,
    },
    cardSubtext: {
      fontSize: 16,
    },
  })

  const cardContent = (
    <View style={styles.cardOuterRow}>
      {props.startIcon ? <Icon name={props.startIcon} style={styles.cardIcon} size={Spacing.xxl} /> : null}
      <View style={styles.cardContentContainer}>
        <View style={styles.cardTitleContainer}>
          <ThemedText variant={props.startIcon ? 'bold' : 'headingFour'} style={styles.cardTitle}>
            {props.title}
          </ThemedText>
          {!props.selected && props.endIcon ? (
            <Icon name={props.endIcon} style={styles.cardIcon} size={Spacing.xl} />
          ) : null}
        </View>
        {props.subtext ? <ThemedText style={styles.cardSubtext}>{props.subtext}</ThemedText> : null}
      </View>
      {/* Rendered as a sibling of the content so it stays vertically centered across title + subtext */}
      {props.selected ? <Icon name="check-circle" color={ColorPalette.brand.primary} size={Spacing.xl} /> : null}
    </View>
  )

  // A selected card represents the already-active choice: it is a non-interactive status indicator,
  // not a button. Render it as a plain accessible container so screen readers announce the full
  // label (title + the method name carried in the subtext) with a "selected" state — not "disabled"
  // — and so it produces no press feedback.
  if (props.selected) {
    return (
      <View
        accessible={true}
        accessibilityLabel={a11yLabel(props.subtext ? `${props.title}. ${props.subtext}` : props.title)}
        accessibilityState={{ selected: true }}
        style={[styles.cardContainer, styles.cardContainerSelected]}
        testID={props.testID ?? testIdWithKey(`CardButton-${props.title}`)}
      >
        {cardContent}
      </View>
    )
  }

  return (
    <PressableOpacity
      accessible={true}
      accessibilityLabel={a11yLabel(props.title)}
      accessibilityRole="button"
      accessibilityHint={props.accessibilityHint}
      accessibilityState={{ disabled: props.disabled }}
      style={[styles.cardContainer, props.disabled && styles.cardContainerDisabled]}
      onPress={props.disabled ? undefined : props.onPress}
      disabled={props.disabled}
      testID={props.testID ?? testIdWithKey(`CardButton-${props.title}`)}
    >
      {cardContent}
    </PressableOpacity>
  )
}
