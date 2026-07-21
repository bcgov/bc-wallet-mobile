import { CLOSE_ICON_SIZE, hitSlop, ICON_CIRCLE_SIZE, ICON_INNER_SIZE, ICON_SIZE } from '@/constants'
import { IColorPalette, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Image, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

export interface NotificationIconProps {
  logoUrl?: string
  iconName: string
  iconColor: string
  hideIconCircle?: boolean
}

/**
 * Displays icons for notifications
 *
 * @param props
 * @returns
 */
export const NotificationIcon: React.FC<NotificationIconProps> = ({ logoUrl, iconName, iconColor, hideIconCircle }) => {
  const { ColorPalette } = useTheme()
  const styles = StyleSheet.create({
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
    icon: { marginRight: 12 },
  })

  if (logoUrl) {
    return (
      <Image
        accessible={false}
        source={{ uri: logoUrl }}
        style={styles.logoImage}
        testID={testIdWithKey('NotificationLogo')}
      />
    )
  }

  return (
    <View style={hideIconCircle ? styles.icon : styles.iconCircle}>
      <Icon accessible={false} name={iconName} size={hideIconCircle ? ICON_SIZE : ICON_INNER_SIZE} color={iconColor} />
    </View>
  )
}

/**
 * Display states for notification cards, matching the BCSC notification designs:
 * blue for unread, white for read, red for warnings and yellow for attention.
 */
export enum NotificationCardStatus {
  /** Notifications the user has not opened yet (blue). */
  Unread = 'Unread',
  /** Notifications the user has already opened (white). */
  Read = 'Read',
  /** Revoked notifications or anything requiring immediate attention (red). */
  Warning = 'Warning',
  /** Notifications needing moderate attention, e.g. expiring soon (yellow). */
  Attention = 'Attention',
}

export const DismissButton: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation()
  const { ColorPalette } = useTheme()
  return (
    <TouchableOpacity
      accessibilityLabel={t('Global.Dismiss')}
      accessibilityRole="button"
      testID={testIdWithKey('DismissNotification')}
      onPress={onClose}
      hitSlop={hitSlop}
    >
      <Icon name="close" size={CLOSE_ICON_SIZE} color={ColorPalette.grayscale.darkGrey} />
    </TouchableOpacity>
  )
}

export interface NotificationCardProps {
  title: string
  description: string
  status: NotificationCardStatus
  onPress: () => void
  onClose?: () => void
  timestamp?: string
  badge?: string
  icon?: string
  iconColor?: string
  hideIconCircle?: boolean
  /**
   * Connection logo to display in place of the icon. Per the designs, notifications
   * from connections show the connection's logo when one is available, and fall back
   * to an icon matching the purpose of the notification otherwise.
   */
  logoUrl?: string
}

/**
 * NotificationCard is a reusable component for displaying notifications with consistent styling and behavior across the app.
 * It supports different types of notifications (info, success, warning, error) and can include an optional action button and dismiss functionality.
 *
 * @param {*} props
 * @return {*}
 */
const NotificationCard: React.FC<NotificationCardProps> = (props) => {
  const { ColorPalette, Spacing } = useTheme()
  const cardStyle = getCardStyle(props.status, ColorPalette)
  const iconColor = props.iconColor ?? ColorPalette.grayscale.white

  const styles = StyleSheet.create({
    container: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      backgroundColor: cardStyle.backgroundColor,
      borderRadius: Spacing.sm,
    },
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
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
    },
    timestampText: {
      marginTop: 8,
      color: ColorPalette.grayscale.mediumGrey,
      fontSize: 13,
    },
    badge: {
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: ColorPalette.grayscale.mediumGrey,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 2,
      marginBottom: 6,
    },
    badgeText: {
      color: ColorPalette.grayscale.darkGrey,
      fontSize: 12,
    },
  })

  const iconName = props.icon ?? cardStyle.defaultIcon

  return (
    <Pressable onPress={props.onPress} accessibilityRole="button" testID={testIdWithKey('NotificationCardPressable')}>
      <View style={styles.container} testID={testIdWithKey('NotificationListItem')}>
        <View style={styles.headerContainer}>
          <NotificationIcon
            logoUrl={props.logoUrl}
            iconName={iconName}
            iconColor={iconColor}
            hideIconCircle={props.hideIconCircle}
          />
          <ThemedText variant="bold" style={styles.headerText} testID={testIdWithKey('HeaderText')}>
            {props.title}
          </ThemedText>
          {props.onClose && <DismissButton onClose={props.onClose} />}
        </View>
        <View style={styles.bodyContainer}>
          {props.badge && (
            <View style={styles.badge}>
              <ThemedText style={styles.badgeText}>{props.badge}</ThemedText>
            </View>
          )}
          <ThemedText style={styles.bodyText} testID={testIdWithKey('BodyText')}>
            {props.description}
          </ThemedText>
          {props.timestamp && (
            <ThemedText style={styles.timestampText} testID={testIdWithKey('TimestampText')}>
              {props.timestamp}
            </ThemedText>
          )}
        </View>
      </View>
    </Pressable>
  )
}

interface CardStyle {
  backgroundColor: string
  defaultIcon: string
}

/**
 * getCardStyle returns the appropriate background color and default icon for a given notification status, based on the app's color palette.
 *
 * @param {NotificationCardStatus} status
 * @param {IColorPalette} palette
 * @return {*}  {CardStyle}
 */
function getCardStyle(status: NotificationCardStatus, palette: IColorPalette): CardStyle {
  switch (status) {
    case NotificationCardStatus.Read:
      return {
        backgroundColor: palette.grayscale.white,
        defaultIcon: 'information',
      }
    case NotificationCardStatus.Warning:
      return {
        backgroundColor: palette.notification.error,
        defaultIcon: 'alert-circle',
      }
    case NotificationCardStatus.Attention:
      return {
        backgroundColor: palette.notification.warn,
        defaultIcon: 'alert',
      }
    case NotificationCardStatus.Unread:
    default:
      return {
        backgroundColor: palette.notification.info,
        defaultIcon: 'information',
      }
  }
}

export default NotificationCard
