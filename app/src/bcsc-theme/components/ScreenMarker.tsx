// components/ScreenMarker.tsx
import { testIdWithKey } from '@bifold/core'
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
 * - testID="ScreenMarker"     → fixed locator (resource-id on Android,
 *                                accessibilityIdentifier on iOS)
 * - text content               → the screen name, readable via "text"
 *                                (Android) or "value"/"label" (iOS)
 * - accessibilityRole="none"  → no semantic announcement by screen readers
 * - accessibilityLabel=""     → screen reader reads nothing if it lands here
 * - Visually hidden            → 1×1 absolute-positioned, clipped, transparent
 *
 * Accessibility impact: minimal. The element is semantically meaningless
 * (role=none, empty label) and virtually unreachable by swipe navigation
 * due to its 1×1 size.  There is no way to fully hide from screen readers
 * while remaining visible to Appium — both use the same accessibility tree.
 *
 * Usage in Appium tests:
 *   1. Find element by resource-id / accessibility-id "ScreenMarker"
 *   2. Read the "text" (Android) or "value" / "label" (iOS) attribute
 */
const ScreenMarker: React.FC<ScreenMarkerProps> = ({ screenName }) => (
  <Text
    testID={testIdWithKey('ScreenMarker')}
    accessibilityRole="none"
    accessibilityLabel=""
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
