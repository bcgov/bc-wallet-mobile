import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { a11yLabel } from '@utils/accessibility'
import { ActivityIndicator, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native'
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
  const { ColorPalette, Spacing, TextTheme } = useTheme()

  const styles = StyleSheet.create({
    container: {
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
    chevronContainer: {
      justifyContent: 'center',
    },
  })

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={() => {
          if (!disabled && !loading) {
            onPress()
          }
        }}
        testID={testIdWithKey(title)}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel(title)}
      >
        <View style={{ flex: 1 }}>
          <View style={styles.titleContainer}>
            <Icon name={icon} size={iconSize} color={ColorPalette.brand.primary} />
            <ThemedText variant={'bold'} style={styles.title} numberOfLines={0}>
              {title}
            </ThemedText>
          </View>
          <ThemedText numberOfLines={0} style={styles.description}>
            {description}
          </ThemedText>
        </View>
        <View style={styles.chevronContainer}>
          {loading ? (
            <ActivityIndicator size="small" color={TextTheme.normal.color} />
          ) : (
            <Icon name={'chevron-right'} size={iconSize} color={TextTheme.normal.color} />
          )}
        </View>
      </TouchableOpacity>
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
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ marginRight: Spacing.lg }}>
            <Icon name={icon} size={iconSize} color={'#1E5189'} />
          </View>
          <View>
            <ThemedText style={{ color: '#1E5189', fontWeight: 'bold' }}>{title}</ThemedText>
            <ThemedText>{description}</ThemedText>
          </View>
        </View>
      </TouchableOpacity>
    </>
  )
}

export default VerifyMethodActionButton
