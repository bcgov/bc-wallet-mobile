import { testIdWithKey, useTheme } from '@bifold/core'
import { Text, View, Image, StyleSheet, ImageSourcePropType, ViewStyle, TouchableOpacity } from 'react-native'
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
  const { ColorPallet, TextTheme, Spacing } = useTheme()
  const styles = StyleSheet.create({
    tile: {
      borderRadius: Spacing.sm,
      borderWidth: 1,
      borderColor: ColorPallet.notification.infoBorder,
      backgroundColor: ColorPallet.notification.info,
      padding: 24,
    },
    actionText: {
      ...TextTheme.bold,
      color: ColorPallet.brand.primary,
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
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.tile}>
        <Text style={styles.actionText}>
          {actionText}
          <Icon size={20} color={ColorPallet.brand.primary} name={'arrow-right-thin'} />
        </Text>
        <Text style={styles.description}>{description}</Text>
        {imgSrc ? (
          <Image source={imgSrc} style={{ flex: 1, height: 100, width: 150, marginTop: 16 }} resizeMode={'contain'} />
        ) : null}
      </View>
    </TouchableOpacity>
  )
}

export default TileButton
