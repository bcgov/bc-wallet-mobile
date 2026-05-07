import { useTheme } from '@bifold/core'
import { StyleSheet, View } from 'react-native'

export const Callout = ({ children }: { children: React.ReactNode }) => {
  const { Spacing, ColorPalette } = useTheme()
  const styles = StyleSheet.create({
    callout: {
      borderLeftWidth: Spacing.sm,
      borderLeftColor: ColorPalette.brand.highlight,
      paddingLeft: Spacing.md,
    },
  })

  return <View style={styles.callout}>{children}</View>
}
