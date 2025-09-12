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
  const { ColorPalette, Spacing } = useTheme()
  const styles = StyleSheet.create({
    container: {
      backgroundColor: ColorPalette.brand.secondaryBackground,
      paddingHorizontal: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: ColorPalette.brand.tertiary,
      borderBottomWidth: 1,
      borderBottomColor: ColorPalette.brand.tertiary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: thumbnailHeight, // needed to constrain the thumbnail
      ...style,
    },
    title: {
      fontWeight: 'normal',
      flex: 1,
      flexWrap: 'wrap',
      paddingRight: Spacing.md,
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
      <ThemedText variant={'headingFour'} style={styles.title}>
        {title}
      </ThemedText>
      <View style={styles.actionContainer}>
        {thumbnailUri ? (
          // At smaller sizes the Image tag will ignore exif tags, which provide orientation (along with other metadata)
          // Image is rendered at a larger size to pick up the exif data, then scaled down to fit in the button
          <Image
            style={{
              height: 200,
              aspectRatio: 1 / 1.3,
              overflow: 'hidden',
              transform: [{ scale: 0.5 }],
              margin: -50,
            }}
            source={{ uri: thumbnailUri }}
          />
        ) : (
          <ThemedText style={{ color: ColorPalette.brand.primary }}>{actionLabel}</ThemedText>
        )}
        <View style={styles.iconContainer}>
          <Icon name={'chevron-right'} size={32} color={ColorPalette.brand.primary} />
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default TakeMediaButton
