import { testIdWithKey, useTheme } from '@bifold/core'
import { Text, View, Image, StyleSheet, Pressable, ImageSourcePropType, ViewStyle } from 'react-native'
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
  const { ColorPallet, TextTheme } = useTheme()
  const styles = StyleSheet.create({
    tile: {
      borderRadius: 4,
      backgroundColor: ColorPallet.notification.info,
      padding: 24,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 4,
      shadowColor: ColorPallet.grayscale.lightGrey,
      shadowOpacity: 0.9,
      elevation: 2, // for older android versions
    },
    actionText: {
      ...TextTheme.bold,
      color: ColorPallet.brand.primary,
    },
    description: {
      ...TextTheme.normal,
      marginTop: 16,
    },
  })

  return (
    <Pressable
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
    </Pressable>
  )
}

export default TileButton
