import { useBCSCAgent } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { useNotifications } from '@/hooks/notifications'
import { useCustomNotifications } from '@/hooks/useCustomNotifications'
import { useTheme } from '@bifold/core'
import { JSX } from 'react'
import { View } from 'react-native'
import CredentialNotification from '../../notifications/CredentialNotification'

/**
 * NotificationsList is a component that conditionally renders notifications based on the agent setup status.
 *
 * @returns React.Element
 */
export const NotificationsList = (): JSX.Element => {
  const { agent } = useBCSCAgent()

  if (agent) {
    return <WithAgentNotificationsList />
  }

  return <WithoutAgentNotificationsList />
}

/**
 * WithAgentNotificationsList renders both credential and custom notifications when the agent is set up.
 *
 * @returns React.Element
 */
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

/**
 * WithoutAgentNotificationsList renders only custom notifications when the agent is not set up, as some internal dependencies require the Agent to be initialized.
 *
 * @returns React.Element
 */
const WithoutAgentNotificationsList = (): JSX.Element => {
  const { customNotifications } = useCustomNotifications()

  return <>{customNotifications}</>
}
