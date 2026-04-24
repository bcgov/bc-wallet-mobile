import { hitSlop } from '@/constants'
import { Button, ButtonType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { CustomNotification } from '@bifold/core/lib/typescript/src/types/notification'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'

const ICON_SIZE = 30

interface CustomNotificationListItemProps {
  notification: CustomNotification
}

const CustomNotificationListItem: React.FC<CustomNotificationListItemProps> = ({ notification }) => {
  const { t } = useTranslation()
  const { ColorPalette } = useTheme()
  const [dismissed, setDismissed] = useState(false)

  const handlePress = useCallback(() => {
    notification.onPressAction?.()
  }, [notification])

  const handleClose = useCallback(() => {
    notification.onCloseAction()
    setDismissed(true)
  }, [notification])

  if (dismissed) {
    return null
  }

  const styles = StyleSheet.create({
    container: {
      borderRadius: 5,
      borderWidth: 2,
      padding: 10,
      backgroundColor: ColorPalette.notification.info,
      borderColor: ColorPalette.notification.infoBorder,
    },
    headerContainer: {
      flexDirection: 'row',
      paddingHorizontal: 5,
      paddingTop: 5,
    },
    bodyContainer: {
      flexGrow: 1,
      flexDirection: 'column',
      marginLeft: 10 + ICON_SIZE,
      paddingHorizontal: 5,
      paddingBottom: 5,
    },
    headerText: {
      flexGrow: 1,
      alignSelf: 'center',
      flex: 1,
      color: ColorPalette.notification.infoText,
    },
    bodyText: {
      flexShrink: 1,
      marginVertical: 15,
      paddingBottom: 10,
      color: ColorPalette.notification.infoText,
    },
    icon: {
      marginRight: 10,
      alignSelf: 'center',
    },
  })

  return (
    <View style={styles.container} testID={testIdWithKey('CustomNotificationListItem')}>
      <View style={styles.headerContainer}>
        <View style={styles.icon}>
          <Icon accessible={false} name="info" size={ICON_SIZE} color={ColorPalette.brand.primary} />
        </View>
        <ThemedText variant="bold" style={styles.headerText} testID={testIdWithKey('HeaderText')}>
          {t(notification.title as any)}
        </ThemedText>
        <TouchableOpacity
          accessibilityLabel={t('Global.Dismiss')}
          accessibilityRole="button"
          testID={testIdWithKey('DismissCustomNotification')}
          onPress={handleClose}
          hitSlop={hitSlop}
        >
          <Icon name="close" size={ICON_SIZE} color={ColorPalette.brand.primary} />
        </TouchableOpacity>
      </View>
      <View style={styles.bodyContainer}>
        <ThemedText style={styles.bodyText} testID={testIdWithKey('BodyText')}>
          {t(notification.description as any)}
        </ThemedText>
        <Button
          title={t(notification.buttonTitle as any)}
          accessibilityLabel={t(notification.buttonTitle as any)}
          testID={testIdWithKey('ViewCustomNotification')}
          buttonType={ButtonType.Primary}
          onPress={handlePress}
        />
      </View>
    </View>
  )
}

export default CustomNotificationListItem
