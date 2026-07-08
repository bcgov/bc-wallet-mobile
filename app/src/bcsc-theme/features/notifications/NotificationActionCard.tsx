import { hitSlop } from '@/constants'
import { Button, ButtonType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Image, ImageStyle, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

const ICON_CIRCLE_SIZE = 36
const ICON_INNER_SIZE = 20
const CLOSE_ICON_SIZE = 24

interface NotificationIconProps {
  logoUrl?: string
  iconName: string
  iconColor: string
  hideIconCircle?: boolean
  circleStyle: ViewStyle
  logoStyle: ImageStyle
}

const NotificationIcon: React.FC<NotificationIconProps> = ({
  logoUrl,
  iconName,
  iconColor,
  hideIconCircle,
  circleStyle,
  logoStyle,
}) => {
  if (logoUrl) {
    return (
      <Image
        accessible={false}
        source={{ uri: logoUrl }}
        style={logoStyle}
        testID={testIdWithKey('NotificationLogo')}
      />
    )
  }

  const styles = StyleSheet.create({
    icon: { marginRight: 12 },
  })
  return (
    <View style={[styles.icon, hideIconCircle ? undefined : circleStyle]}>
      <Icon
        accessible={false}
        name={iconName}
        size={hideIconCircle ? ICON_CIRCLE_SIZE : ICON_INNER_SIZE}
        color={iconColor}
      />
    </View>
  )
}

interface NotificationActionCardProps {
  title: string
  description: string
  buttonTitle: string
  onPress: () => void
  onClose?: () => void
  icon?: string
  iconColor?: string
  hideIconCircle?: boolean
}

const NotificationActionCard: React.FC<NotificationActionCardProps> = (props) => {
  const { t } = useTranslation()
  const { ColorPalette, Spacing } = useTheme()
  const iconColor = props.iconColor ?? ColorPalette.grayscale.white
  const iconName = props.icon ?? 'information'

  const styles = StyleSheet.create({
    container: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      backgroundColor: ColorPalette.brand.modalTertiaryBackground,
      borderWidth: 2,
      borderColor: ColorPalette.notification.infoBorder,
      borderRadius: 8,
    },
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconCircle: {
      width: ICON_CIRCLE_SIZE,
      height: ICON_CIRCLE_SIZE,
      borderRadius: ICON_CIRCLE_SIZE / 2,
      backgroundColor: ColorPalette.grayscale.mediumGrey,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    logoImage: {
      width: ICON_CIRCLE_SIZE,
      height: ICON_CIRCLE_SIZE,
      borderRadius: ICON_CIRCLE_SIZE / 2,
      marginRight: 12,
    },
    bodyContainer: {
      marginLeft: ICON_CIRCLE_SIZE + 12,
      marginTop: 4,
    },
    headerText: {
      flex: 1,
    },
    bodyText: {
      marginTop: 4,
      fontSize: Spacing.md,
    },
    buttonContainer: {
      marginTop: 12,
    },
  })

  return (
    <View style={styles.container} testID={testIdWithKey('NotificationListItem')}>
      <View style={styles.headerContainer}>
        <NotificationIcon
          iconName={iconName}
          iconColor={iconColor}
          hideIconCircle={props.hideIconCircle}
          circleStyle={styles.iconCircle}
          logoStyle={styles.logoImage}
        />
        <ThemedText variant="bold" style={styles.headerText} testID={testIdWithKey('HeaderText')}>
          {props.title}
        </ThemedText>
        {props.onClose && (
          <TouchableOpacity
            accessibilityLabel={t('Global.Dismiss')}
            accessibilityRole="button"
            testID={testIdWithKey('DismissNotification')}
            onPress={props.onClose}
            hitSlop={hitSlop}
          >
            <Icon name="close" size={CLOSE_ICON_SIZE} color={ColorPalette.grayscale.darkGrey} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.bodyContainer}>
        <ThemedText style={styles.bodyText} testID={testIdWithKey('BodyText')}>
          {props.description}
        </ThemedText>
        <View style={styles.buttonContainer}>
          <Button
            title={props.buttonTitle}
            accessibilityLabel={t(props.buttonTitle)}
            testID={testIdWithKey('ViewNotification')}
            buttonType={ButtonType.Primary}
            onPress={props.onPress}
          />
        </View>
      </View>
    </View>
  )
}

export default NotificationActionCard
