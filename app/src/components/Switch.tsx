import { useTheme } from '@bifold/core'
import React, { useCallback } from 'react'
import { Pressable, StyleSheet, ViewStyle } from 'react-native'
import Animated, { interpolateColor, useAnimatedStyle, useDerivedValue, withTiming } from 'react-native-reanimated'
import Icon from 'react-native-vector-icons/MaterialIcons'

const TRACK_WIDTH = 52
const TRACK_HEIGHT = 32
const TRACK_PADDING = 3
const THUMB_SIZE = TRACK_HEIGHT - TRACK_PADDING * 2
const THUMB_TRAVEL = TRACK_WIDTH - THUMB_SIZE - TRACK_PADDING * 2
const ICON_SIZE = 18
const ANIMATION_DURATION = 150

export interface SwitchProps {
  value: boolean
  onValueChange?: (value: boolean) => void
  disabled?: boolean
  accessibilityLabel?: string
  accessibilityHint?: string
  testID?: string
  style?: ViewStyle
  /**
   * Render as a non-interactive indicator, for rows where the containing
   * pressable owns the press handling and accessibility.
   */
  presentational?: boolean
}

/**
 * Themed switch used in place of RN's native `Switch`, which can't be styled
 * consistently across platforms. The thumb carries a check/close glyph so the
 * state reads without relying on colour alone.
 */
export const Switch = ({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
  style,
  presentational = false,
}: SwitchProps) => {
  const { ColorPalette } = useTheme()

  const progress = useDerivedValue(() => withTiming(value ? 1 : 0, { duration: ANIMATION_DURATION }), [value])

  const trackOff = ColorPalette.grayscale.mediumGrey
  const trackOn = disabled ? ColorPalette.brand.primaryDisabled : ColorPalette.brand.primary

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [trackOff, trackOn]),
  }))

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * THUMB_TRAVEL }],
  }))

  const onIconStyle = useAnimatedStyle(() => ({ opacity: progress.value }))
  const offIconStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value }))

  const styles = StyleSheet.create({
    track: {
      width: TRACK_WIDTH,
      height: TRACK_HEIGHT,
      borderRadius: TRACK_HEIGHT / 2,
      padding: TRACK_PADDING,
      justifyContent: 'center',
      opacity: disabled ? 0.5 : 1,
    },
    thumb: {
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      borderRadius: THUMB_SIZE / 2,
      backgroundColor: ColorPalette.grayscale.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    icon: {
      position: 'absolute',
    },
  })

  const handlePress = useCallback(() => {
    if (!disabled) {
      onValueChange?.(!value)
    }
  }, [disabled, onValueChange, value])

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      pointerEvents={presentational ? 'none' : 'auto'}
      accessible={!presentational}
      accessibilityElementsHidden={presentational}
      importantForAccessibility={presentational ? 'no-hide-descendants' : 'auto'}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      testID={testID}
      style={style}
    >
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.thumb, thumbStyle]}>
          <Animated.View style={[styles.icon, onIconStyle]}>
            <Icon name="check" size={ICON_SIZE} color={trackOn} />
          </Animated.View>
          <Animated.View style={[styles.icon, offIconStyle]}>
            <Icon name="close" size={ICON_SIZE} color={trackOff} />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  )
}
