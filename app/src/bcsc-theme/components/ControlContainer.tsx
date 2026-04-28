import { useTheme } from '@bifold/core'
import { View } from 'react-native'

interface ControlContainerProps {
  children: React.ReactNode
}

const SHADOW_SIZE = 5

/**
 * To be used in ScreenWrapper controls to apply an opaque background and a shadow
 * cast only above the container (so the bottom safe area blends seamlessly).
 */
export const ControlContainer = ({ children }: ControlContainerProps) => {
  const { Spacing, ColorPalette } = useTheme()
  return (
    <View style={{ flexGrow: 1, width: '100%' }}>
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
      {/* Thin shadow caster sitting on the top edge. It has a small height so
        iOS has an outline to project a shadow from, and its shadow offset is
        negative so the blur appears above the container, not below it. */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          backgroundColor: ColorPalette.brand.primaryBackground,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -SHADOW_SIZE },
          shadowOpacity: 0.6,
          shadowRadius: SHADOW_SIZE,
          elevation: SHADOW_SIZE,
          zIndex: 1,
        }}
      />
    </View>
  )
}
