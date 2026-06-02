import { PressableOpacity } from '@/components/PressableOpacity'
import { a11yLabel } from '@/utils/accessibility'
import { ThemedText, useTheme } from '@bifold/core'
import React, { Children, isValidElement, ReactElement, ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'

interface ListButtonGroupProps {
  // Optional gap between buttons in the group. Defaults to theme Spacing.xs / 2
  gap?: number
  // Accepts ListButton elements as children. Falsy children (e.g. from `cond && <ListButton />`)
  // are filtered out so callers can render rows conditionally.
  children: ReactNode
}

export interface ListButtonProps {
  onPress: () => void
  /**
   * The content of the button. Can be any React node (text, views, components, etc.).
   * Plain string children are wrapped in a `ThemedText` for convenience.
   */
  children: React.ReactNode
  /**
   * Optional accessibility label. If not provided and `children` is a string,
   * the string is used to derive the accessibility label.
   */
  accessibilityLabel?: string
  accessibilityHint?: string
  testID?: string
  disabled?: boolean
  position?: 'first' | 'middle' | 'last' | 'only' // Position in the list to determine border radius
}

/**
 * A ListButton component that renders a pressable list row containing arbitrary content.
 * Accepts any React node as children (text, views, components, etc.) and a `position`
 * prop to determine the border radius of the button when used in a group.
 *
 * @example:
 * ╭──────────────╮
 * │ Item 1       │ ← first (rounded top)
 * ├──────────────┤
 * │ Item 2       │ ← middle (square)
 * ├──────────────┤
 * │ Item 3       │ ← last (rounded bottom)
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
    contentContainer: {
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

  const isStringChild = typeof props.children === 'string'
  const resolvedA11yLabel =
    props.accessibilityLabel ?? (isStringChild ? a11yLabel(props.children as string) : undefined)

  return (
    <PressableOpacity
      accessible={true}
      style={[styles.container, getBorderRadiusStyle()]}
      onPress={props.onPress}
      disabled={props.disabled}
      accessibilityRole="button"
      accessibilityLabel={resolvedA11yLabel}
      accessibilityHint={props.accessibilityHint}
      testID={props.testID}
    >
      <View style={styles.contentContainer}>
        {isStringChild ? <ThemedText style={styles.text}>{props.children}</ThemedText> : props.children}
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
  const listButtons = Children.toArray(props.children).filter(isValidElement) as ReactElement<ListButtonProps>[]

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'column',
      gap: props.gap ?? Spacing.xs / 2,
    },
  })

  const getPosition = (index: number) => {
    if (listButtons.length === 1) {
      return 'only'
    }

    if (index === 0) {
      return 'first'
    }

    if (index === listButtons.length - 1) {
      return 'last'
    }

    return 'middle'
  }

  return (
    <View style={styles.container}>
      {listButtons.map((child, index) => {
        return React.cloneElement(child as ReactElement<ListButtonProps>, { position: getPosition(index) })
      })}
    </View>
  )
}
