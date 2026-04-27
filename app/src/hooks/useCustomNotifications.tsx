import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCState, VerificationStatus } from '@/store'
import { NotificationListItem, useStore } from '@bifold/core'
import { useCallback, useMemo, useState } from 'react'

type NotificationItemListProps = React.ComponentProps<typeof NotificationListItem>
export type CustomNotificationConfig = NonNullable<NotificationItemListProps['customNotification']> & {
  id: CustomNotificationId
}

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
  const secureActions = useSecureActions()

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
   * Custom notification configurations to be displayed on the Home screen.
   *
   * @returns An array of custom notification configurations to be displayed on the Home screen.
   */
  const customNotificationConfigs = useMemo(() => {
    const notifications: CustomNotificationConfig[] = []

    if (!store.bcscSecure.verified && store.bcscSecure.verifiedStatus !== VerificationStatus.IN_PROGRESS) {
      notifications.push({
        id: CustomNotificationId.BCSCStartVerification,
        component: () => null,
        onPressAction: () => {
          secureActions.continueVerificationProcess()
        },
        onCloseAction: () => {
          dismissCustomNotification(CustomNotificationId.BCSCStartVerification)
        },
        pageTitle: '',
        title: 'StartVerificationNotification.Title',
        description: 'StartVerificationNotification.Description',
        buttonTitle: 'StartVerificationNotification.ButtonTitle',
      })
    }

    return notifications.filter((n) => !dismissedIds.has(n.id))
  }, [
    secureActions,
    store.bcscSecure.verified,
    store.bcscSecure.verifiedStatus,
    dismissedIds,
    dismissCustomNotification,
  ])

  return useMemo(
    () => ({
      customNotificationConfigs,
      dismissCustomNotification,
    }),
    [customNotificationConfigs, dismissCustomNotification]
  )
}
