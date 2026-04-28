import { useNotifications } from '@/hooks/notifications'
import useBCAgentSetup from '@/hooks/useBCAgentSetup'
import { useCustomNotifications } from '@/hooks/useCustomNotifications'
import { useNavigation } from '@react-navigation/native'
import { JSX, useEffect } from 'react'
import CredentialNotification from '../../notifications/CredentialNotification'

/**
 * NotificationsList is a component that conditionally renders notifications based on the agent setup status.
 * If the agent is set up, it renders both credential and custom notifications using WithAgentNotificationsList.
 * If the agent is not set up, it renders only custom notifications using WithoutAgentNotificationsList, as some internal dependencies require the Agent to be initialized.
 *
 * @returns React.Element
 */
export const NotificationsList = (): JSX.Element => {
  // FIXME (V4.1.x): Replace this useBCAgentSetup hook with the new useAgent hook once complete.
  const { agent } = useBCAgentSetup()

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
  const navigation = useNavigation()
  const notifications = useNotifications()
  const { customNotifications } = useCustomNotifications()

  useEffect(() => {
    // Set the tab bar badge to the total number of notifications (credential + custom)
    navigation.setOptions({ tabBarBadge: notifications.length + customNotifications.length || undefined })
  }, [customNotifications.length, navigation, notifications.length])

  return (
    <>
      {customNotifications}
      {notifications.map((notification) => (
        <CredentialNotification key={notification.id} notification={notification} />
      ))}
    </>
  )
}

/**
 * WithoutAgentNotificationsList renders only custom notifications when the agent is not set up, as some internal dependencies require the Agent to be initialized.
 *
 * @returns React.Element
 */
const WithoutAgentNotificationsList = (): JSX.Element => {
  const navigation = useNavigation()
  const { customNotifications } = useCustomNotifications()

  useEffect(() => {
    // Set the tab bar badge to the total number of notifications (custom)
    navigation.setOptions({ tabBarBadge: customNotifications.length || undefined })
  }, [navigation, customNotifications.length])

  return <>{customNotifications}</>
}
