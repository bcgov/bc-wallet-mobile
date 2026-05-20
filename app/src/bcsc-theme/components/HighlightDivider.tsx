import { useTheme } from '@bifold/core'
import { StyleProp, View, ViewStyle } from 'react-native'

interface HighlightDividerProps {
  style?: StyleProp<ViewStyle>
  thickness?: number
  color?: string
}

/**
 * A thin horizontal divider rendered in the BC brand highlight (gold) color.
 * Use it to visually separate sections of content (e.g., between an input and
 * its supporting description).
 */
export const HighlightDivider = ({ style, thickness = 2, color }: HighlightDividerProps) => {
  const { ColorPalette } = useTheme()
  return (
    <View
      style={[
        {
          height: thickness,
          backgroundColor: color ?? ColorPalette.brand.highlight,
        },
        style,
      ]}
    />
  )
}
