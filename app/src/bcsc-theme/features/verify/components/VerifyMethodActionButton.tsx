import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { a11yLabel } from '@utils/accessibility'
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

type VerifyMethodActionButtonProps = {
  style?: ViewStyle
  icon: string
  title: string
  description: string
  onPress: () => void
  disabled?: boolean
}

const iconSize = 36

const VerifyMethodActionButton = ({
  style = {},
  title,
  description,
  icon,
  onPress,
  disabled = false,
}: VerifyMethodActionButtonProps) => {
  const { ColorPalette, Spacing } = useTheme()

  const styles = StyleSheet.create({
    container: {
      marginBottom: Spacing.md,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: ColorPalette.grayscale.veryLightGrey,
      flexDirection: 'row',
      alignItems: 'center',
      ...style,
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
      marginBottom: Spacing.sm,
    },
    title: {
      color: ColorPalette.brand.primary,
      marginLeft: Spacing.sm,
    },
    description: {
      flexShrink: 1,
    },
    contentContainer: {
      flex: 1,
      flexShrink: 1,
      minWidth: 0,
    },
    chevronContainer: {
      justifyContent: 'center',
    },
  })

  return (
    <TouchableOpacity
      style={{ ...styles.container, backgroundColor: ColorPalette.brand.tertiaryBackground, borderRadius: Spacing.sm }}
      onPress={() => {
        if (!disabled) {
          onPress()
        }
      }}
      testID={testIdWithKey(title)}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel(title)}
    >
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0 }}>
        <View style={{ marginRight: Spacing.lg }}>
          <Icon name={icon} size={iconSize} color={ColorPalette.brand.headerText} />
        </View>
        <View style={styles.contentContainer}>
          <ThemedText style={{ color: ColorPalette.brand.headerText, fontWeight: 'bold' }}>{title}</ThemedText>
          <ThemedText style={styles.description}>{description}</ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default VerifyMethodActionButton
