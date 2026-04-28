import { useNotifications } from '@/hooks/notifications'
import useBCAgentSetup from '@/hooks/useBCAgentSetup'
import { useCustomNotifications } from '@/hooks/useCustomNotifications'
import { getCredentialNotificationType } from '@/utils/credentials'
import { useNavigation } from '@react-navigation/native'
import { useEffect } from 'react'
import NotificationListItem from '../../notifications/NotificationListItem'

/**
 * NotificationsList is a component that conditionally renders notifications based on the agent setup status.
 * If the agent is set up, it renders both credential and custom notifications using WithAgentNotificationsList.
 * If the agent is not set up, it renders only custom notifications using WithoutAgentNotificationsList, as some internal dependencies require the Agent to be initialized.
 *
 * @returns React.Element
 */
export const NotificationsList = () => {
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
const WithAgentNotificationsList = () => {
  const notifications = useNotifications()
  const { customNotificationConfigs } = useCustomNotifications()
  const navigation = useNavigation()

  useEffect(() => {
    // Set the tab bar badge to the total number of notifications (credential + custom)
    navigation.setOptions({ tabBarBadge: notifications.length + customNotificationConfigs.length || undefined })
  }, [customNotificationConfigs.length, navigation, notifications.length])

  return (
    <>
      {customNotificationConfigs.map((config) => (
        <NotificationListItem key={config.id} notification={config} />
      ))}

      {notifications.map((item) => (
        <NotificationListItem
          key={item.id}
          notificationType={getCredentialNotificationType(item)}
          notification={item}
        />
      ))}
    </>
  )
}

/**
 * WithoutAgentNotificationsList renders only custom notifications when the agent is not set up, as some internal dependencies require the Agent to be initialized.
 *
 * @returns React.Element
 */
const WithoutAgentNotificationsList = () => {
  const navigation = useNavigation()
  const { customNotificationConfigs } = useCustomNotifications()

  useEffect(() => {
    // Set the tab bar badge to the total number of notifications (custom)
    navigation.setOptions({ tabBarBadge: customNotificationConfigs.length || undefined })
  }, [navigation, customNotificationConfigs.length])

  return (
    <>
      {customNotificationConfigs.map((config) => (
        <NotificationListItem key={config.id} notification={config} />
      ))}
    </>
  )
}
