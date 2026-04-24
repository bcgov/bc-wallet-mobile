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
  const { customNotifications, getCustomNotificationConfig } = useCustomNotifications()

  const allNotifications = [...customNotifications, ...notifications]

  return (
    <>
      {allNotifications.map((item) => (
        <NotificationListItem
          key={item.id}
          notificationType={getCredentialNotificationType(item)}
          notification={item}
          customNotification={getCustomNotificationConfig(item.id)}
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
  const { customNotifications, getCustomNotificationConfig } = useCustomNotifications()

  return (
    <>
      {customNotifications.map((item) => {
        const config = getCustomNotificationConfig(item.id)
        if (!config) {
          return null
        }
        return <CustomNotificationListItem key={item.id} notification={config} />
      })}
    </>
  )
}
