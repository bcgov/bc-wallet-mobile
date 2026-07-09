import { ICON_CIRCLE_SIZE } from '@/constants'
import { Button, ButtonType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { DismissButton, NotificationIcon } from './NotificationCard'

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
        <NotificationIcon iconName={iconName} iconColor={iconColor} hideIconCircle={props.hideIconCircle} />
        <ThemedText variant="bold" style={styles.headerText} testID={testIdWithKey('HeaderText')}>
          {props.title}
        </ThemedText>
        {props.onClose && <DismissButton onClose={props.onClose} />}
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
