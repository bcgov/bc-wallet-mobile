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
  isFirst?: boolean // First button only has top border radius
  isLast?: boolean // Last button only has bottom border radius
}

/**
 * A ListButton component that renders a button with text and an optional end adornment.
 * It also accepts isFirst and isLast props to determine the border radius of the button.
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
      borderRadius: Spacing.xs,
      borderTopLeftRadius: props.isFirst ? Spacing.sm : 0,
      borderTopRightRadius: props.isFirst ? Spacing.sm : 0,
      borderBottomLeftRadius: props.isLast ? Spacing.sm : 0,
      borderBottomRightRadius: props.isLast ? Spacing.sm : 0,
    },
    textContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    text: {
      color: ColorPalette.brand.headerText,
    },
  })

  return (
    <PressableOpacity accessible={true} style={styles.container} onPress={props.onPress}>
      <View style={styles.textContainer}>
        <ThemedText style={styles.text}>{props.text}</ThemedText>
        {props.endAdornment}
      </View>
    </PressableOpacity>
  )
}

/**
 * A ListButtonGroup component that renders a group of ListButton components with appropriate border radius based on their position in the group.
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

  return (
    <View style={styles.container}>
      {ListButtons.map((child, index) => {
        const isFirst = index === 0
        const isLast = index === ListButtons.length - 1

        return React.cloneElement(child as ReactElement<ListButtonProps>, {
          isFirst,
          isLast,
        })
      })}
    </View>
  )
}
