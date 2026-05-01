import { PressableOpacity } from '@/components/PressableOpacity'
import { ThemedText, useTheme } from '@bifold/core'
import React, { Children, ReactElement } from 'react'
import { StyleSheet, View } from 'react-native'

interface ListButtonGroupProps {
  // Accepts either a single ListButton or an array of ListButtons as children
  children: ReactElement<ListButtonProps> | ReactElement<ListButtonProps>[]
}

export interface ListButtonProps {
  text: string
  onPress: () => void
  endAdornment?: React.ReactNode // Optional end adornment (e.g., an icon, text, etc.)
  position?: 'first' | 'middle' | 'last' | 'only' // Position in the list to determine border radius
}

/**
 * A ListButton component that renders a button with text and an optional end adornment.
 * It also accepts isFirst and isLast props to determine the border radius of the button.
 *
 * @example:
 * ╭──────────────╮
 * │ Item 1       │ ← isFirst (rounded top)
 * ├──────────────┤
 * │ Item 2       │ ← middle (square)
 * ├──────────────┤
 * │ Item 3       │ ← isLast (rounded bottom)
 * ╰──────────────╯
 *
 * @example:
 * Only one item in the list:
 * ╭──────────────╮
 * │ Item 1       │ ← only (rounded)
 * ╰──────────────╯
 *
 * @param props - The props for the ListButton component.
 * @returns A React element representing the ListButton component.
 */
export const ListButton = (props: ListButtonProps) => {
  const { Spacing, ColorPalette } = useTheme()

  const styles = StyleSheet.create({
    container: {
      padding: Spacing.md,
      backgroundColor: ColorPalette.brand.tertiaryBackground,
    },
    textContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    text: {
      color: ColorPalette.brand.headerText,
    },
  })

  const getBorderRadiusStyle = () => {
    if (props.position === 'only') {
      return { borderRadius: Spacing.sm }
    }

    if (props.position === 'first') {
      return { borderTopLeftRadius: Spacing.sm, borderTopRightRadius: Spacing.sm }
    }

    if (props.position === 'last') {
      return { borderBottomLeftRadius: Spacing.sm, borderBottomRightRadius: Spacing.sm }
    }

    if (props.position === 'middle') {
      return { borderRadius: 0 }
    }
  }

  return (
    <PressableOpacity accessible={true} style={[styles.container, getBorderRadiusStyle()]} onPress={props.onPress}>
      <View style={styles.textContainer}>
        <ThemedText style={styles.text}>{props.text}</ThemedText>
        {props.endAdornment}
      </View>
    </PressableOpacity>
  )
}

/**
 * A ListButtonGroup component that renders a group of ListButton components with appropriate border radius based on their position in the group.
 * Automagically injects the position prop into each ListButton child based on its index in the children array (first, middle, last, only).
 *
 * @param props - The props for the ListButtonGroup component, which includes the children ListButton components.
 * @returns A React element representing the ListButtonGroup component.
 */
export const ListButtonGroup = (props: ListButtonGroupProps) => {
  const { Spacing } = useTheme()
  const ListButtons = Children.toArray(props.children)

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'column',
      gap: Spacing.xs / 2,
    },
  })

  const getPosition = (index: number) => {
    if (ListButtons.length === 1) {
      return 'only'
    }

    if (index === 0) {
      return 'first'
    }

    if (index === ListButtons.length - 1) {
      return 'last'
    }

    return 'middle'
  }

  return (
    <View style={styles.container}>
      {ListButtons.map((child, index) => {
        return React.cloneElement(child as ReactElement<ListButtonProps>, { position: getPosition(index) })
      })}
    </View>
  )
}
