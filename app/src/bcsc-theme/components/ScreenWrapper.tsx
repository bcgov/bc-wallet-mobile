import React, { ComponentProps } from 'react'
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'

import { KeyboardView } from '@bifold/core'
import { useHeaderHeight } from '@react-navigation/elements'
import { Edges, SafeAreaView } from 'react-native-safe-area-context'

const useSafeHeaderHeight = (): number => {
  try {
    return useHeaderHeight()
  } catch {
    return 100
  }
}

interface ScreenWrapperProps {
  children: React.ReactNode
  controls?: React.ReactNode
  /**
   * Whether to use KeyboardView to handle keyboard interactions
   * @default false
   */
  keyboardActive?: boolean
  /**
   * Safe area edges to respect
   * @default ['bottom', 'left', 'right']
   */
  edges?: Edges
  /**
   * Style for the SafeAreaView container (or KeyboardAwareScrollView content when keyboardActive)
   */
  style?: StyleProp<ViewStyle>
  /**
   * Whether to wrap children in a ScrollView
   * @default true
   */
  scrollable?: boolean
  /**
   * Style for the ScrollView content container
   */
  scrollViewContainerStyle?: ComponentProps<typeof ScrollView>['contentContainerStyle']
  /**
   * Style for the controls container at the bottom
   */
  controlsContainerStyle?: StyleProp<ViewStyle>
}

/**
 * Wraps content in a SafeAreaView and optionally a KeyboardView, and provides a container for controls.
 */
const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  children,
  controls,
  keyboardActive = false,
  edges = ['bottom', 'left', 'right'],
  style,
  scrollable = true,
  scrollViewContainerStyle,
  controlsContainerStyle,
}) => {
  const headerHeight = useSafeHeaderHeight()
  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
  })

  const renderScrollableContent = () => {
    if (!scrollable || keyboardActive) {
      return children
    }

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={scrollViewContainerStyle}>
        {children}
      </ScrollView>
    )
  }

  // KeyboardView has its own SafeAreaView, so we don't need to double-wrap
  if (keyboardActive) {
    return (
      <KeyboardView>
        <KeyboardAwareScrollView
          keyboardShouldPersistTaps={'handled'}
          keyboardOpeningTime={100}
          extraScrollHeight={headerHeight}
          contentContainerStyle={[styles.container, style]}
        >
          {renderScrollableContent()}
          {controls && <View style={controlsContainerStyle}>{controls}</View>}
        </KeyboardAwareScrollView>
      </KeyboardView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, style]} edges={edges}>
      {renderScrollableContent()}
      {controls && <View style={controlsContainerStyle}>{controls}</View>}
    </SafeAreaView>
  )
}

export default ScreenWrapper
