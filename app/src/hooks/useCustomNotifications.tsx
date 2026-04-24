import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCState, VerificationStatus } from '@/store'
import { useStore } from '@bifold/core'
import { useMemo } from 'react'
import { CustomNotificationConfig } from './notifications'

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
  const secureActions = useSecureActions()

  /**
   * Custom notification configurations to be displayed on the Home screen.
   *
   * @returns An array of custom notification configurations to be displayed on the Home screen.
   */
  const customNotificationConfigs = useMemo(() => {
    const notifications: (CustomNotificationConfig & { id: string })[] = []

    if (!store.bcscSecure.verified && store.bcscSecure.verifiedStatus !== VerificationStatus.IN_PROGRESS) {
      notifications.push({
        id: CustomNotificationId.BCSCStartVerification,
        component: () => null,
        onPressAction: () => {
          secureActions.continueVerificationProcess()
        },
        onCloseAction: () => {},
        pageTitle: '',
        title: 'StartVerificationNotification.Title',
        description: 'StartVerificationNotification.Description',
        buttonTitle: 'StartVerificationNotification.ButtonTitle',
      })
    }

    return notifications
  }, [secureActions, store.bcscSecure.verified, store.bcscSecure.verifiedStatus])

  return useMemo(
    () => ({
      customNotificationConfigs,
    }),
    [customNotificationConfigs]
  )
}
