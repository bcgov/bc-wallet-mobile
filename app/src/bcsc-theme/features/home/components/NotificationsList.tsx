import { useNotifications } from '@/hooks/notifications'
import { useCustomNotifications } from '@/hooks/useCustomNotifications'
import { getCredentialNotificationType } from '@/utils/credentials'
import { NotificationListItem } from '@bifold/core'
import CustomNotificationListItem from './CustomNotificationListItem'

/**
 * WithAgentNotificationsList renders both credential and custom notifications when the agent is set up.
 *
 * @returns React.Element
 */
export const WithAgentNotificationsList = () => {
  const notifications = useNotifications()
  const { customNotificationConfigs } = useCustomNotifications()

  return (
    <>
      {customNotificationConfigs.map((config) => (
        <CustomNotificationListItem key={config.id} notification={config} />
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
export const WithoutAgentNotificationsList = () => {
  const { customNotificationConfigs } = useCustomNotifications()

  return (
    <>
      {customNotificationConfigs.map((config) => (
        <CustomNotificationListItem key={config.id} notification={config} />
      ))}
    </>
  )
}
