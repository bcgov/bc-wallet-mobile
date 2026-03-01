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
 * - accessible={false}       → not focusable by VoiceOver / TalkBack, but
 *                               still present in the view hierarchy so Appium
 *                               (XCUITest / UiAutomator2) can find it
 *
 * Note: accessibilityElementsHidden and importantForAccessibility="no-hide-
 * descendants" are intentionally NOT used — they remove the element from the
 * accessibility tree entirely, which also hides it from Appium.
 *
 * Usage in Appium tests:
 *   1. Find element by resource-id / accessibility-id "ScreenMarker"
 *   2. Read attribute "content-desc" (Android) or "label" (iOS) to get the name
 */
const ScreenMarker: React.FC<ScreenMarkerProps> = ({ screenName }) => (
  <View
    testID="ScreenMarker"
    accessibilityLabel={screenName}
    accessible={false}
    style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
  />
)

export default ScreenMarker
