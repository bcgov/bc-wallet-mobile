import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { Image, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native'

import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

interface TakeMediaButtonProps {
  onPress: () => void
  title: string
  actionLabel: string
  thumbnailUri?: string
  style?: ViewStyle
}

const thumbnailHeight = 80

const TakeMediaButton = ({ onPress, title, actionLabel, thumbnailUri, style = {} }: TakeMediaButtonProps) => {
  const { ColorPallet, Spacing } = useTheme()
  const styles = StyleSheet.create({
    container: {
      backgroundColor: ColorPallet.brand.secondaryBackground,
      paddingHorizontal: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: ColorPallet.brand.tertiary,
      borderBottomWidth: 1,
      borderBottomColor: ColorPallet.brand.tertiary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: thumbnailHeight, // needed to constrain the thumbnail
      ...style,
    },
    actionContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    image: {
      height: thumbnailHeight,
      aspectRatio: 1,
    },
    iconContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingLeft: thumbnailUri ? Spacing.md : Spacing.sm,
    },
  })

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      testID={testIdWithKey(actionLabel)}
      accessibilityLabel={actionLabel}
    >
      <ThemedText variant={'headingFour'} style={{ fontWeight: 'normal' }}>
        {title}
      </ThemedText>
      <View style={styles.actionContainer}>
        {thumbnailUri ? (
          <Image source={{ uri: thumbnailUri }} resizeMode={'cover'} style={styles.image} />
        ) : (
          <ThemedText style={{ color: ColorPallet.brand.primary }}>{actionLabel}</ThemedText>
        )}
        <View style={styles.iconContainer}>
          <Icon name={'chevron-right'} size={32} color={ColorPallet.brand.primary} />
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default TakeMediaButton