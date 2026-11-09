import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { a11yLabel } from '@utils/accessibility'
import { Image, ImageSourcePropType, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

export type TileButtonProps = {
  onPress: () => void
  testIDKey: string
  accessibilityLabel: string
  actionText: string
  description: string
  imgSrc?: ImageSourcePropType
  style?: ViewStyle
}

const TileButton: React.FC<TileButtonProps> = ({
  onPress,
  testIDKey,
  accessibilityLabel,
  actionText,
  description,
  imgSrc,
  style,
}: TileButtonProps) => {
  const { ColorPalette, TextTheme, Spacing } = useTheme()
  const styles = StyleSheet.create({
    tile: {
      borderRadius: Spacing.sm,
      borderWidth: 1,
      borderColor: ColorPalette.notification.infoBorder,
      backgroundColor: ColorPalette.notification.info,
      padding: 24,
    },
    actionText: {
      ...TextTheme.bold,
      color: ColorPalette.brand.primary,
    },
    description: {
      ...TextTheme.normal,
      marginTop: Spacing.md,
    },
  })

  return (
    <TouchableOpacity
      style={style}
      onPress={onPress}
      testID={testIdWithKey(testIDKey)}
      accessibilityLabel={a11yLabel(accessibilityLabel)}
    >
      <View style={styles.tile}>
        <ThemedText variant={'bold'} style={styles.actionText}>
          {actionText}
          <Icon size={20} color={ColorPalette.brand.primary} name={'arrow-right-thin'} />
        </ThemedText>
        <ThemedText style={styles.description}>{description}</ThemedText>
        {imgSrc ? (
          <Image source={imgSrc} style={{ flex: 1, height: 100, width: 150, marginTop: 16 }} resizeMode={'contain'} />
        ) : null}
      </View>
    </TouchableOpacity>
  )
}

export default TileButton
