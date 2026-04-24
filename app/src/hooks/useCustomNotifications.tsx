import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCState, VerificationStatus } from '@/store'
import { useStore } from '@bifold/core'
import { CustomNotificationRecord } from '@bifold/core/lib/typescript/src/types/notification'
import { useCallback, useMemo } from 'react'
import { CustomNotificationConfig } from './notifications'

export enum CustomNotificationId {
  BCSCStartVerification = 'BCSCStartVerification',
}

/**
 * Hook to manage custom notifications in the app.
 */
export const useCustomNotifications = () => {
  const [store] = useStore<BCState>()
  const secureActions = useSecureActions()

  /**
   * Defines the configuration for the "Start Verification" custom notification
   *
   * @example
   *  title: 'You're not verified',
   *  description: 'You can continue the verification process at anytime.'
   *  buttonTitle: 'Start verification'
   *
   * @returns The configuration object for the "Start Verification" custom notification.
   */
  const startVerificationNotification = useCallback((): CustomNotificationConfig => {
    return {
      component: () => null,
      onPressAction: () => {
        secureActions.continueVerificationProcess()
      },
      onCloseAction: () => {},
      pageTitle: '',
      title: 'StartVerificationNotification.Title',
      description: 'StartVerificationNotification.Description',
      buttonTitle: 'StartVerificationNotification.ButtonTitle',
    }
  }, [secureActions])

  /**
   * Retrieves the custom notification configuration based on the provided ID.
   *
   * @param id - The ID of the custom notification to retrieve.
   * @returns The custom notification configuration if found, otherwise undefined.
   */
  const getCustomNotificationConfig = useCallback(
    (id: string | CustomNotificationId): CustomNotificationConfig | undefined => {
      if (id === CustomNotificationId.BCSCStartVerification) {
        return startVerificationNotification()
      }
    },
    [startVerificationNotification]
  )

  const customNotifications = useMemo(() => {
    const notifications: CustomNotificationRecord[] = []

    if (!store.bcscSecure.verified && store.bcscSecure.verifiedStatus !== VerificationStatus.IN_PROGRESS) {
      notifications.push({
        id: CustomNotificationId.BCSCStartVerification,
        type: 'CustomNotification',
        createdAt: new Date(),
      })
    }

    return notifications
  }, [store.bcscSecure.verified, store.bcscSecure.verifiedStatus])

  return useMemo(
    () => ({
      customNotifications,
      getCustomNotificationConfig,
      startVerificationNotificationConfig: startVerificationNotification,
    }),
    [customNotifications, getCustomNotificationConfig, startVerificationNotification]
  )
}
