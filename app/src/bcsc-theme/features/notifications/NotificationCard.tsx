import { hitSlop } from '@/constants'
import { Button, ButtonType, IColorPalette, InfoBoxType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'

const NOTIFICATION_CARD_ICON_SIZE = 30

interface NotificationCardStyle {
  backgroundColor: string
  borderColor: string
  textColor: string
  iconColor: string
  icon: string
}

interface NotificationCardProps {
  title: string
  description: string
  buttonTitle: string
  cardType: InfoBoxType
  onPress: () => void
  onClose?: () => void
}

/**
 * A reusable notification card component that displays a title, description, and an action button.
 *
 * @param props - The properties for the NotificationCard component, including title, description, button title, card type, and action callbacks.
 * @returns React.Element - The rendered NotificationCard component.
 */
const NotificationCard: React.FC<NotificationCardProps> = (props: NotificationCardProps) => {
  const { t } = useTranslation()
  const { ColorPalette } = useTheme()

  const cardStyle = _getNotificationCardStyle(props.cardType, ColorPalette)

  const styles = StyleSheet.create({
    container: {
      borderRadius: 5,
      borderWidth: 2,
      padding: 10,
      backgroundColor: cardStyle.backgroundColor,
      borderColor: cardStyle.borderColor,
    },
    headerContainer: {
      flexDirection: 'row',
      paddingHorizontal: 5,
      paddingTop: 5,
    },
    bodyContainer: {
      flexGrow: 1,
      flexDirection: 'column',
      marginLeft: 10 + NOTIFICATION_CARD_ICON_SIZE,
      paddingHorizontal: 5,
      paddingBottom: 5,
    },
    headerText: {
      flexGrow: 1,
      alignSelf: 'center',
      flex: 1,
      color: cardStyle.textColor,
    },
    bodyText: {
      flexShrink: 1,
      marginVertical: 15,
      paddingBottom: 10,
      color: cardStyle.textColor,
    },
    icon: {
      marginRight: 10,
      alignSelf: 'center',
    },
  })

  return (
    <View style={styles.container} testID={testIdWithKey('NotificationListItem')}>
      <View style={styles.headerContainer}>
        <View style={styles.icon}>
          <Icon accessible={false} name="info" size={NOTIFICATION_CARD_ICON_SIZE} color={cardStyle.iconColor} />
        </View>
        <ThemedText variant="bold" style={styles.headerText} testID={testIdWithKey('HeaderText')}>
          {t(props.title)}
        </ThemedText>
        <TouchableOpacity
          accessibilityLabel={t('Global.Dismiss')}
          accessibilityRole="button"
          testID={testIdWithKey('DismissNotification')}
          onPress={props.onClose}
          hitSlop={hitSlop}
        >
          <Icon name="close" size={NOTIFICATION_CARD_ICON_SIZE} color={ColorPalette.brand.primary} />
        </TouchableOpacity>
      </View>
      <View style={styles.bodyContainer}>
        <ThemedText style={styles.bodyText} testID={testIdWithKey('BodyText')}>
          {t(props.description)}
        </ThemedText>
        <Button
          title={props.buttonTitle}
          accessibilityLabel={t(props.buttonTitle)}
          testID={testIdWithKey('ViewNotification')}
          buttonType={ButtonType.Primary}
          onPress={props.onPress}
        />
      </View>
    </View>
  )
}

// Private helper to return the appropriate style for the notification card
const _getNotificationCardStyle = (cardType: InfoBoxType, ColorPalette: IColorPalette): NotificationCardStyle => {
  switch (cardType) {
    case InfoBoxType.Success:
      return {
        backgroundColor: ColorPalette.notification.success,
        borderColor: ColorPalette.notification.successBorder,
        textColor: ColorPalette.notification.successText,
        iconColor: ColorPalette.notification.successIcon,
        icon: 'check-circle',
      }

    case InfoBoxType.Warn:
      return {
        backgroundColor: ColorPalette.notification.warn,
        borderColor: ColorPalette.notification.warnBorder,
        textColor: ColorPalette.notification.warnText,
        iconColor: ColorPalette.notification.warnIcon,
        icon: 'warning',
      }

    case InfoBoxType.Error:
      return {
        backgroundColor: ColorPalette.notification.error,
        borderColor: ColorPalette.notification.errorBorder,
        textColor: ColorPalette.notification.errorText,
        iconColor: ColorPalette.notification.errorIcon,
        icon: 'error',
      }

    // InfoBoxType.Info
    default:
      return {
        backgroundColor: ColorPalette.notification.info,
        borderColor: ColorPalette.notification.infoBorder,
        textColor: ColorPalette.notification.infoText,
        iconColor: ColorPalette.brand.primary,
        icon: 'info',
      }
  }
}

export default NotificationCard
