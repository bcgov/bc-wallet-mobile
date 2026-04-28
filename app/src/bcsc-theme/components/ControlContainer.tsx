import { useTheme } from '@bifold/core'
import { View } from 'react-native'

interface ControlContainerProps {
  children: React.ReactNode
}

/**
 * To be used in ScreenWrapper controls to apply an opaque background and shadow
 */
export const ControlContainer = ({ children }: ControlContainerProps) => {
  const { Spacing, ColorPalette } = useTheme()
  return (
    <View
      style={{
        flexGrow: 1,
        shadowOffset: { width: 0, height: -Spacing.sm },
        shadowOpacity: 0.2,
        shadowRadius: Spacing.sm,
        backgroundColor: ColorPalette.brand.primaryBackground,
        width: '100%',
        padding: Spacing.lg,
      }}
    >
      <View style={{ flexGrow: 1, gap: Spacing.sm }}>{children}</View>
    </View>
  )
}
