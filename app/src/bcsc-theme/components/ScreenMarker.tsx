// components/ScreenMarker.tsx
import React from 'react'
import { View } from 'react-native'

interface ScreenMarkerProps {
  screenName: string
}

/**
 * Invisible marker that identifies the current screen for automated tests.
 * Uses testID which maps to accessibilityIdentifier (iOS) / resource-id (Android).
 * Neither is exposed to screen readers.
 */
const ScreenMarker: React.FC<ScreenMarkerProps> = ({ screenName }) => (
  <View
    testID={`Screen:${screenName}`}
    accessibilityElementsHidden={true}        // iOS: hide from VoiceOver tree
    importantForAccessibility="no-hide-descendants" // Android: hide from TalkBack tree
    style={{ position: 'absolute', width: 0, height: 0 }}
  />
)

export default ScreenMarker