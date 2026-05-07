import StartVerificationNotification from '@/bcsc-theme/features/notifications/StartVerificationNotification'
import { BCState, VerificationStatus } from '@/store'
import { useStore } from '@bifold/core'
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
  const [store] = useStore<BCState>()
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

    if (!store.bcscSecure.verified && store.bcscSecure.verifiedStatus !== VerificationStatus.IN_PROGRESS) {
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
  }, [store.bcscSecure.verified, store.bcscSecure.verifiedStatus, dismissCustomNotification, dismissedIds])

  return useMemo(
    () => ({
      customNotifications,
      dismissCustomNotification,
    }),
    [customNotifications, dismissCustomNotification]
  )
}
