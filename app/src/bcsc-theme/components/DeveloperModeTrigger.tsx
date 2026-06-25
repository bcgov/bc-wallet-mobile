import { testIdWithKey, useDeveloperMode } from '@bifold/core'
import React from 'react'
import { Pressable, StyleProp, Vibration, ViewStyle } from 'react-native'

interface DeveloperModeTriggerProps {
  /** Fired once the hidden tap-counter reaches the developer-menu threshold. */
  onActivate: () => void
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
}

/**
 * Wraps content in a hidden, accessibility-excluded tap target that opens the developer
 * (IAS environment) menu after the required number of taps, vibrating on activation. Used on
 * the first onboarding / verification screens so dev/QA can reach the developer menu before
 * any registration happens.
 */
export const DeveloperModeTrigger: React.FC<DeveloperModeTriggerProps> = ({ onActivate, children, style }) => {
  const { incrementDeveloperMenuCounter } = useDeveloperMode(() => {
    Vibration.vibrate()
    onActivate()
  })

  return (
    <Pressable
      onPress={incrementDeveloperMenuCounter}
      style={style}
      accessible={false}
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
      testID={testIdWithKey('DeveloperCounter')}
    >
      {children}
    </Pressable>
  )
}

export default DeveloperModeTrigger
