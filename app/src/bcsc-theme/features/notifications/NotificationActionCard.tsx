import { useServerStatus } from '@/bcsc-theme/contexts/ServerStatusContext'
import { BCSCMainStackParams, BCSCModals } from '@/bcsc-theme/types/navigators'
import { ICON_CIRCLE_SIZE } from '@/constants'
import { TestIds } from '@/test-ids/registry'
import { Button, ButtonType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback } from 'react'
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
  /**
   * When set, tapping the button while IAS is down opens the ServiceOutage screen instead of running
   * `onPress` — for cards whose action starts an IAS-dependent flow (verification).
   */
  requiresServerStatus?: boolean
}

const NotificationActionCard: React.FC<NotificationActionCardProps> = (props) => {
  const { ColorPalette, Spacing } = useTheme()
  const { isAvailable: isServerAvailable } = useServerStatus()
  const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()
  const iconColor = props.iconColor ?? ColorPalette.grayscale.white
  const iconName = props.icon ?? 'information'

  const { onPress, requiresServerStatus } = props
  const handlePress = useCallback(() => {
    if (requiresServerStatus && !isServerAvailable) {
      navigation.navigate(BCSCModals.ServiceOutage, {})
      return
    }
    onPress()
  }, [requiresServerStatus, isServerAvailable, navigation, onPress])

  const styles = StyleSheet.create({
    container: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      backgroundColor: ColorPalette.brand.modalTertiaryBackground,
      borderWidth: 2,
      borderColor: ColorPalette.notification.infoBorder,
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
      fontSize: Spacing.md,
    },
    buttonContainer: {
      marginTop: 12,
    },
  })

  return (
    <View style={styles.container} testID={testIdWithKey(TestIds.main.notification.item)}>
      <View style={styles.headerContainer}>
        <NotificationIcon iconName={iconName} iconColor={iconColor} hideIconCircle={props.hideIconCircle} />
        <ThemedText
          variant="bold"
          style={styles.headerText}
          testID={testIdWithKey(TestIds.main.notification.headerText)}
        >
          {props.title}
        </ThemedText>
        {props.onClose && <DismissButton onClose={props.onClose} />}
      </View>
      <View style={styles.bodyContainer}>
        <ThemedText style={styles.bodyText} testID={testIdWithKey(TestIds.main.notification.bodyText)}>
          {props.description}
        </ThemedText>
        <View style={styles.buttonContainer}>
          <Button
            title={props.buttonTitle}
            accessibilityLabel={props.buttonTitle}
            testID={testIdWithKey(TestIds.main.notification.view)}
            buttonType={ButtonType.Primary}
            onPress={handlePress}
          />
        </View>
      </View>
    </View>
  )
}

export default NotificationActionCard
