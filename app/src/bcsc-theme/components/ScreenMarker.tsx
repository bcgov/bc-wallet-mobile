// components/ScreenMarker.tsx
import React from 'react'
import { View } from 'react-native'

interface ScreenMarkerProps {
  screenName: string
}

/**
 * Invisible marker that identifies the current screen for automated tests.
 *
 * - testID="ScreenMarker"    → fixed locator (resource-id on Android,
 *                               accessibilityIdentifier on iOS)
 * - accessibilityLabel       → carries the screen name, readable via
 *                               content-desc (Android) / label (iOS)
 * - accessible={true}        → REQUIRED for Appium discovery — both XCUITest
 *                               and UiAutomator2 query the accessibility tree;
 *                               elements not in the tree are invisible to them
 * - accessibilityRole="none" → minimizes screen reader impact (no semantic
 *                               announcement); 1×1 absolute-positioned element
 *                               is virtually unreachable by swipe navigation
 *
 * Usage in Appium tests:
 *   1. Find element by resource-id / accessibility-id "ScreenMarker"
 *   2. Read attribute "content-desc" (Android) or "label" (iOS) to get the name
 */
const ScreenMarker: React.FC<ScreenMarkerProps> = ({ screenName }) => (
  <View
    testID="ScreenMarker"
    accessible={true}
    accessibilityLabel={screenName}
    accessibilityRole="none"
    style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}
  />
)

export default ScreenMarker
