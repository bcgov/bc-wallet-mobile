import { hitSlop } from '@/constants'
import { Button, ButtonType, IColorPalette, InfoBoxType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, TouchableOpacity, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'

const ICON_CIRCLE_SIZE = 36
const ICON_INNER_SIZE = 20
const CLOSE_ICON_SIZE = 24

interface NotificationCardProps {
  title: string
  description: string
  cardType: InfoBoxType
  onPress: () => void
  onClose?: () => void
  buttonTitle?: string
  timestamp?: string
  badge?: string
  icon?: string
  backgroundColor?: string
}

/**
 * NotificationCard is a reusable component for displaying notifications with consistent styling and behavior across the app.
 * It supports different types of notifications (info, success, warning, error) and can include an optional action button and dismiss functionality.
 *
 * @param {*} props
 * @return {*}
 */
const NotificationCard: React.FC<NotificationCardProps> = (props) => {
  const { t } = useTranslation()
  const { ColorPalette, Spacing } = useTheme()
  const cardStyle = getCardStyle(props.cardType, ColorPalette)
  const iconColor = ColorPalette.grayscale.mediumGrey

  const isV1 = !!props.buttonTitle

  const styles = StyleSheet.create({
    container: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      backgroundColor: isV1
        ? ColorPalette.brand.modalTertiaryBackground
        : (props.backgroundColor ?? cardStyle.backgroundColor),
      ...(isV1 && {
        borderWidth: 1,
        borderColor: ColorPalette.notification.infoBorder,
        borderRadius: 8,
      }),
    },
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconCircle: {
      width: ICON_CIRCLE_SIZE,
      height: ICON_CIRCLE_SIZE,
      borderRadius: ICON_CIRCLE_SIZE / 2,
      backgroundColor: iconColor,
      justifyContent: 'center',
      alignItems: 'center',
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
    buttonContainer: {
      marginTop: 12,
    },
  })

  const iconName = props.icon ?? cardStyle.defaultIcon

  const content = (
    <View style={styles.container} testID={testIdWithKey('NotificationListItem')}>
      <View style={styles.headerContainer}>
        <View style={styles.iconCircle}>
          <Icon accessible={false} name={iconName} size={ICON_INNER_SIZE} color="#FFFFFF" />
        </View>
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
        {props.buttonTitle && (
          <View style={styles.buttonContainer}>
            <Button
              title={props.buttonTitle}
              accessibilityLabel={t(props.buttonTitle)}
              testID={testIdWithKey('ViewNotification')}
              buttonType={ButtonType.Primary}
              onPress={props.onPress}
            />
          </View>
        )}
      </View>
    </View>
  )

  if (props.buttonTitle) {
    return content
  }

  return (
    <Pressable onPress={props.onPress} accessibilityRole="button" testID={testIdWithKey('NotificationCardPressable')}>
      {content}
    </Pressable>
  )
}

interface CardStyle {
  backgroundColor: string
  defaultIcon: string
}

/**
 * getCardStyle returns the appropriate background color and default icon for a given notification type, based on the app's color palette.
 *
 * @param {InfoBoxType} cardType
 * @param {IColorPalette} palette
 * @return {*}  {CardStyle}
 */
function getCardStyle(cardType: InfoBoxType, palette: IColorPalette): CardStyle {
  switch (cardType) {
    case InfoBoxType.Success:
      return {
        backgroundColor: palette.notification.success,
        defaultIcon: 'check-circle',
      }
    case InfoBoxType.Warn:
      return {
        backgroundColor: palette.notification.warn,
        defaultIcon: 'warning',
      }
    case InfoBoxType.Error:
      return {
        backgroundColor: palette.notification.error,
        defaultIcon: 'error',
      }
    default:
      return {
        backgroundColor: palette.notification.info,
        defaultIcon: 'info',
      }
  }
}

export default NotificationCard
