import { useNotifications } from '@/hooks/notifications'
import { useCustomNotifications } from '@/hooks/useCustomNotifications'
import { useTheme } from '@bifold/core'
import { JSX } from 'react'
import { View } from 'react-native'
import CredentialNotification from '../../notifications/CredentialNotification'
import { EmptyNotification } from '../../notifications/EmptyNotification'

/**
 * NotificationsList component displays a list of notifications, including custom and credential notifications.
 *
 * @returns React.Element
 */
export const NotificationsList = (): JSX.Element => {
  const notifications = useNotifications()
  const { customNotifications } = useCustomNotifications()
  const { Spacing } = useTheme()

  if (!notifications.length && !customNotifications.length) {
    // ie: You have no new notifications
    return <EmptyNotification />
  }

  return (
    <>
      {customNotifications}
      {notifications.length > 0 && (
        <View style={{ marginHorizontal: -Spacing.lg }}>
          {notifications.map((notification) => (
            <CredentialNotification key={notification.id} notification={notification} />
          ))}
        </View>
      )}
    </>
  )
}
