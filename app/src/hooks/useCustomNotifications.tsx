import StartVerificationNotification from '@/bcsc-theme/features/notifications/StartVerificationNotification'
import { useVerificationStatus } from '@/bcsc-theme/hooks/useVerificationStatus'
import { JSX, useCallback, useMemo, useState } from 'react'

export enum CustomNotificationId {
  BCSCStartVerification = 'BCSCStartVerification',
}

/**
 * Hook to manage custom notifications in the app.
 *
 * @returns An object containing an array of custom notifications to be displayed on the Home screen.
 */
export const useCustomNotifications = () => {
  const { needsVerification } = useVerificationStatus()
  const [dismissedIds, setDismissedIds] = useState<Set<CustomNotificationId>>(new Set())

  /**
   * Dismisses a custom notification by adding its ID to the dismissedIds set.
   *
   * @param id - The ID of the custom notification to dismiss.
   * @returns void
   */
  const dismissCustomNotification = useCallback((id: CustomNotificationId) => {
    setDismissedIds((prev) => new Set(prev).add(id))
  }, [])

  /**
   * Generates an array of custom notifications to be displayed.
   */
  const customNotifications = useMemo((): JSX.Element[] => {
    const notifications = []

    if (needsVerification) {
      notifications.push({
        id: CustomNotificationId.BCSCStartVerification,
        element: (
          <StartVerificationNotification
            key={CustomNotificationId.BCSCStartVerification}
            onClose={() => dismissCustomNotification(CustomNotificationId.BCSCStartVerification)}
          />
        ),
      })
    }

    return notifications
      .filter((notification) => !dismissedIds.has(notification.id))
      .map((notification) => notification.element)
  }, [needsVerification, dismissCustomNotification, dismissedIds])

  return useMemo(
    () => ({
      customNotifications,
      dismissCustomNotification,
    }),
    [customNotifications, dismissCustomNotification]
  )
}
