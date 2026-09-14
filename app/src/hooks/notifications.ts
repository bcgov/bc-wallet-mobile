import { NotificationsContext, type CredentialNotificationRecord } from '@/hooks/NotificationsProvider'
import { useContext } from 'react'

export type { CredentialNotificationRecord } from '@/hooks/NotificationsProvider'

/**
 * A thin context reader, all major work is done in {@link NotificationsProvider}. This hook is just a convenience for consumers.
 *
 * @returns The current notifications list.
 */
export const useNotifications = (): Array<CredentialNotificationRecord> => {
  const ctx = useContext(NotificationsContext)
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationsProvider')
  }
  return ctx.notifications
}
