import { useNotifications } from '@/hooks/notifications'
import useBCAgentSetup from '@/hooks/useBCAgentSetup'
import { useCustomNotifications } from '@/hooks/useCustomNotifications'
import { JSX } from 'react'
import CredentialNotification from '../../notifications/CredentialNotification'

/**
 * NotificationsList is a component that conditionally renders notifications based on the agent setup status.
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
  const notifications = useNotifications()
  const { customNotifications } = useCustomNotifications()

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
  const { customNotifications } = useCustomNotifications()

  return <>{customNotifications}</>
}
