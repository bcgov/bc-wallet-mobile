import React, { ComponentProps } from 'react'
import { ScrollView, ScrollViewProps, StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'

import { KeyboardView } from '@bifold/core'
import { Edges, SafeAreaView } from 'react-native-safe-area-context'

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
   * @default ['top', 'bottom', 'left', 'right']
   */
  edges?: Edges
  /**
   * Style for the SafeAreaView container
   */
  safeAreaViewStyle?: ComponentProps<typeof SafeAreaView>['style']
  /**
   * Whether to wrap children in a ScrollView
   * @default true
   */
  scrollable?: boolean
  /**
   * Props to pass to the ScrollView component
   * Includes style, contentContainerStyle, and all other ScrollView props
   */
  scrollViewProps?: ScrollViewProps
  /**
   * Style for the controls container at the bottom
   */
  controlsContainerStyle?: StyleProp<ViewStyle>
  /**
   * Style for the container View that wraps content and controls
   */
  containerStyle?: StyleProp<ViewStyle>
}

/**
 * Wraps content in a SafeAreaView and optionally a KeyboardView, and provides a container for controls.
 *
 * @param {*} {
 *   children,
 *   controls,
 *   keyboardActive = false,
 *   edges = ['bottom', 'left', 'right'],
 *   safeAreaViewStyle,
 *   scrollable = true,
 *   scrollViewProps,
 *   controlsContainerStyle,
 *   containerStyle,
 * }
 * @return {*}
 */
const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  children,
  controls,
  keyboardActive = false,
  edges = ['top', 'bottom', 'left', 'right'],
  safeAreaViewStyle,
  scrollable = true,
  scrollViewProps,
  controlsContainerStyle,
  containerStyle,
}) => {
  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
  })

  const renderScrollableContent = () => {
    if (!scrollable || keyboardActive) {
      return children
    }

    return <ScrollView {...scrollViewProps}>{children}</ScrollView>
  }

  // Render the content for the screen (scrollable content and controls)
  const renderContent = () => {
    return (
      <>
        {renderScrollableContent()}
        {controls && <View style={controlsContainerStyle}>{controls}</View>}
      </>
    )
  }

  // KeyboardView has its own SafeAreaView, so we don't need to double-wrap
  if (keyboardActive) {
    return (
      <KeyboardView>
        <KeyboardAwareScrollView
          keyboardShouldPersistTaps={'handled'}
          keyboardOpeningTime={150}
          contentContainerStyle={[styles.container, containerStyle]}
        >
          {renderContent()}
        </KeyboardAwareScrollView>
      </KeyboardView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, safeAreaViewStyle]} edges={edges}>
      <View style={[styles.container, containerStyle]}>{renderContent()}</View>
    </SafeAreaView>
  )
}

export default ScreenWrapper
