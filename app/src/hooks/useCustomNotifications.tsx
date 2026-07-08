import CardExpiryNotification from '@/bcsc-theme/features/notifications/CardExpiryNotification'
import CardRenewalNotification from '@/bcsc-theme/features/notifications/CardRenewalNotification'
import StartVerificationNotification from '@/bcsc-theme/features/notifications/StartVerificationNotification'
import { useVerificationStatus } from '@/bcsc-theme/hooks/useVerificationStatus'
import { BCState } from '@/store'
import { useStore } from '@bifold/core'
import { JSX, useCallback, useMemo, useState } from 'react'

export enum CustomNotificationId {
  BCSCStartVerification = 'BCSCStartVerification',
  AccountExpired = 'AccountExpired',
  AccountRenewalAvailable = 'AccountRenewalAvailable',
}

/**
 * Hook to manage custom notifications in the app.
 *
 * @returns An object containing an array of custom notifications to be displayed on the Home screen.
 */
export const useCustomNotifications = () => {
  const { needsVerification } = useVerificationStatus()
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
    const notifications: { id: CustomNotificationId; dismissible: boolean; element: JSX.Element }[] = []

    if (store.bcsc.showAccountExpiryNotification) {
      notifications.push({
        id: CustomNotificationId.AccountExpired,
        dismissible: false,
        element: <CardExpiryNotification key={CustomNotificationId.AccountExpired} />,
      })
    }

    if (store.bcsc.showCardRenewalNotification) {
      notifications.push({
        id: CustomNotificationId.AccountRenewalAvailable,
        dismissible: false,
        element: <CardRenewalNotification key={CustomNotificationId.AccountRenewalAvailable} />,
      })
    }

    if (needsVerification) {
      notifications.push({
        id: CustomNotificationId.BCSCStartVerification,
        dismissible: true,
        element: (
          <StartVerificationNotification
            key={CustomNotificationId.BCSCStartVerification}
            onClose={() => dismissCustomNotification(CustomNotificationId.BCSCStartVerification)}
          />
        ),
      })
    }

    return notifications
      .filter((notification) => !notification.dismissible || !dismissedIds.has(notification.id))
      .map((notification) => notification.element)
  }, [
    store.bcsc.showAccountExpiryNotification,
    store.bcsc.showCardRenewalNotification,
    needsVerification,
    dismissCustomNotification,
    dismissedIds,
  ])

  return useMemo(
    () => ({
      customNotifications,
      dismissCustomNotification,
    }),
    [customNotifications, dismissCustomNotification]
  )
}
