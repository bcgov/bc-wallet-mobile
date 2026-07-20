import { PressableOpacity } from '@/components/PressableOpacity'
import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { a11yLabel } from '@utils/accessibility'
import React from 'react'
import { StyleSheet, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'

interface PairingCodeCardProps {
  title: string
  description: string
  onPress: () => void
  testID?: string
  accessibilityHint?: string
}

const ICON_SIZE = 28
const BORDER_RADIUS = 12

/**
 * Home screen "Log in from another device" card: a compact, light-blue action card that deep-links to
 * the pairing code screen. Purpose-built (rather than the shared CardButton) so its spacing, icon size,
 * shadow, and colours can be tuned independently to the Figma spec.
 */
const PairingCodeCard: React.FC<PairingCodeCardProps> = ({
  title,
  description,
  onPress,
  testID,
  accessibilityHint,
}) => {
  const { ColorPalette, Spacing } = useTheme()

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.lg,
      backgroundColor: ColorPalette.brand.tertiaryBackground,
      borderRadius: BORDER_RADIUS,
      // Drop shadow biased downward: bottom + slightly on the sides, not the top.
      // The top stays clean because the vertical offset is >= the blur radius.
      shadowColor: ColorPalette.grayscale.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    content: {
      flex: 1,
    },
    title: {
      color: ColorPalette.brand.primary,
      fontSize: 16,
      lineHeight: 22,
    },
    description: {
      color: ColorPalette.brand.primary,
      fontSize: 15,
      lineHeight: 22,
      marginTop: 2,
    },
  })

  return (
    <PressableOpacity
      style={styles.container}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel(title)}
      accessibilityHint={accessibilityHint}
      testID={testID ?? testIdWithKey('PairingCodeCard')}
    >
      <Icon name={'login'} size={ICON_SIZE} color={ColorPalette.brand.primary} accessible={false} />
      <View style={styles.content}>
        <ThemedText variant={'bold'} style={styles.title}>
          {title}
        </ThemedText>
        <ThemedText style={styles.description}>{description}</ThemedText>
      </View>
    </PressableOpacity>
  )
}

export default PairingCodeCard
