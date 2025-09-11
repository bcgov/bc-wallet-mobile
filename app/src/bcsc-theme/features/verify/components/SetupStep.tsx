import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import React, { PropsWithChildren } from 'react'
import { GestureResponderEvent, TouchableOpacity, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

interface SetupStepProps {
  title: string
  subtext: string[]
  onPress: (event: GestureResponderEvent) => void
  isComplete: boolean
  isFocused: boolean
}

/**
 * Renders a Setup Step component.
 *
 * Rules:
 *  1. When the Step is focused is can be pressed
 *  2. When the Step is complete is can not be pressed, and a green check will appear
 *  3. Subtext will be rendered below the Step header
 *  4. Additional children can be provided to be rendered below the subtext. ie: stepHeader->subtext->children
 *
 *  @param {PropsWithChildren<SetupStepProps>} props - The SetupStep props
 *  @returns {*} {JSX.Element}
 */
export const SetupStep = (props: PropsWithChildren<SetupStepProps>) => {
  const { TextTheme, ColorPalette } = useTheme()

  const canBeFocused = props.isFocused && !props.isComplete
  const backgroundColor = canBeFocused ? ColorPalette.brand.primary : ColorPalette.brand.secondaryBackground
  const textColor = canBeFocused ? ColorPalette.brand.text : TextTheme.headingFour.color

  return (
    <TouchableOpacity
      onPress={props.onPress}
      testID={testIdWithKey(props.title)}
      accessibilityLabel={props.title}
      disabled={props.isComplete || !props.isFocused}
      style={{
        paddingVertical: 24,
        paddingHorizontal: 24,
        backgroundColor: backgroundColor,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <ThemedText
          variant={'headingFour'}
          style={{
            marginRight: 16,
            color: textColor,
          }}
          accessibilityLabel={props.title}
        >
          {props.title}
        </ThemedText>

        {props.isComplete ? <Icon name={'check-circle'} size={24} color={ColorPalette.semantic.success} /> : null}
      </View>

      <View style={{ marginTop: 8 }}>
        {props.subtext.map((subtext, id) => (
          <ThemedText key={`${subtext}-${id}`} style={{ color: textColor }}>
            {subtext}
          </ThemedText>
        ))}

        {props.children}
      </View>
    </TouchableOpacity>
  )
}
