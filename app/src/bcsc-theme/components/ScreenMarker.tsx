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
 *
 * Hidden from screen readers so it has zero accessibility impact.
 *
 * Usage in Appium tests:
 *   1. Find element by resource-id / accessibility-id "ScreenMarker"
 *   2. Read attribute "content-desc" (Android) or "label" (iOS) to get the name
 */
const ScreenMarker: React.FC<ScreenMarkerProps> = ({ screenName }) => (
  <View
    testID="ScreenMarker"
    accessibilityLabel={screenName}
    accessibilityElementsHidden={true} // iOS: hide from VoiceOver tree
    importantForAccessibility="no-hide-descendants" // Android: hide from TalkBack tree
    style={{ position: 'absolute', width: 0, height: 0 }}
  />
)

export default ScreenMarker
