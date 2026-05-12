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
  loading?: boolean
  disabled?: boolean
}

const iconSize = 36

const VerifyMethodActionButton = ({
  style = {},
  title,
  description,
  icon,
  onPress,
  loading,
  disabled = false,
}: VerifyMethodActionButtonProps) => {
  const { ColorPalette, Spacing } = useTheme()

  const styles = StyleSheet.create({
    container: {
      marginBottom: Spacing.md,
      marginHorizontal: Spacing.md,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: '#EDEBE9',
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
      style={{ ...styles.container, backgroundColor: '#D8EAFD', borderRadius: Spacing.sm }}
      onPress={() => {
        if (!disabled && !loading) {
          onPress()
        }
      }}
      testID={testIdWithKey(title)}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel(title)}
    >
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0 }}>
        <View style={{ marginRight: Spacing.lg }}>
          <Icon name={icon} size={iconSize} color={'#1E5189'} />
        </View>
        <View style={styles.contentContainer}>
          <ThemedText style={{ color: '#1E5189', fontWeight: 'bold' }}>{title}</ThemedText>
          <ThemedText style={styles.description}>{description}</ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default VerifyMethodActionButton
