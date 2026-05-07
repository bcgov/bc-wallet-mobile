import { SHADOW_CASTER_HEIGHT, SHADOW_COLOR, SHADOW_OFFSET_UP, SHADOW_OPACITY, SHADOW_RADIUS } from '@/constants'
import { useTheme } from '@bifold/core'
import { View } from 'react-native'

import DropShadow from 'react-native-drop-shadow'

interface ControlContainerProps {
  children: React.ReactNode
}

/**
 * To be used in ScreenWrapper controls to apply an opaque background and a shadow
 * cast only above the container (so the bottom safe area blends seamlessly).
 */
export const ControlContainer = ({ children }: ControlContainerProps) => {
  const { Spacing, ColorPalette } = useTheme()
  return (
    <View style={{ flexGrow: 1, width: '100%' }}>
      {/* Top-edge shadow caster. DropShadow renders the shadow based on its
          children's alpha, so we give it a thin opaque strip pinned to the top
          and offset the shadow upward. The strip itself sits flush against the
          container body, so there's no visible seam below. */}
      <DropShadow
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          shadowColor: SHADOW_COLOR,
          shadowOffset: SHADOW_OFFSET_UP,
          shadowOpacity: SHADOW_OPACITY,
          shadowRadius: SHADOW_RADIUS,
          zIndex: -1,
        }}
      >
        <View
          style={{
            height: SHADOW_CASTER_HEIGHT,
            backgroundColor: ColorPalette.brand.primaryBackground,
          }}
        />
      </DropShadow>
      <View
        style={{
          flexGrow: 1,
          backgroundColor: ColorPalette.brand.primaryBackground,
          padding: Spacing.lg,
          gap: Spacing.sm,
        }}
      >
        {children}
      </View>
    </View>
  )
}
