import { useBCSCAgent } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { useNotifications } from '@/hooks/notifications'
import { useCustomNotifications } from '@/hooks/useCustomNotifications'
import { useTheme } from '@bifold/core'
import { JSX } from 'react'
import { View } from 'react-native'
import CredentialNotification from '../../notifications/CredentialNotification'

export const NotificationsList = (): JSX.Element => {
  const { agent } = useBCSCAgent()

  if (agent) {
    return <WithAgentNotificationsList />
  }

  return <WithoutAgentNotificationsList />
}

const WithAgentNotificationsList = (): JSX.Element => {
  const notifications = useNotifications()
  const { customNotifications } = useCustomNotifications()
  const { Spacing } = useTheme()

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

const WithoutAgentNotificationsList = (): JSX.Element => {
  const { customNotifications } = useCustomNotifications()

  return <>{customNotifications}</>
}
