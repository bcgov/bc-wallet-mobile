// components/ScreenMarker.tsx
import React from 'react'
import { Text } from 'react-native'

interface ScreenMarkerProps {
  screenName: string
}

/**
 * Invisible marker that identifies the current screen for automated tests.
 *
 * Uses a Text element (not View) because both Appium drivers (XCUITest and
 * UiAutomator2) query the accessibility tree, and empty Views — regardless
 * of accessible={true} — may be pruned by the platform's accessibility
 * framework.  Text elements with content are ALWAYS present in the tree.
 *
 * - testID="ScreenMarker"  → fixed locator (resource-id on Android,
 *                             accessibilityIdentifier on iOS)
 * - text content            → the screen name, readable via "text" attribute
 *                             (Android) or "value"/"label" (iOS)
 * - Visually hidden         → transparent 1×1 absolute-positioned, clipped
 *
 * Usage in Appium tests:
 *   1. Find element by resource-id / accessibility-id "ScreenMarker"
 *   2. Read the "text" (Android) or "value" / "label" (iOS) attribute
 */
const ScreenMarker: React.FC<ScreenMarkerProps> = ({ screenName }) => (
  <Text
    testID="ScreenMarker"
    accessibilityLabel={screenName}
    style={{
      position: 'absolute',
      width: 1,
      height: 1,
      overflow: 'hidden',
      color: 'transparent',
      fontSize: 1,
    }}
  >
    {screenName}
  </Text>
)

export default ScreenMarker
