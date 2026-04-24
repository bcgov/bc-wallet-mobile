import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import PersonCredential from '@/bcwallet-theme/features/person-flow/screens/PersonCredential'
import { useCallback, useMemo } from 'react'
import { CustomNotificationConfig, CustomNotificationID } from './notifications'

/**
 * Hook to manage custom notifications in the app.
 */
export const useCustomNotifications = () => {
  const secureActions = useSecureActions()

  /**
   * Defines the configuration for the "Start Verification" custom notification
   *
   * @returns The configuration object for the "Start Verification" custom notification.
   */
  const startVerificationNotification = useCallback((): CustomNotificationConfig => {
    return {
      component: PersonCredential as React.FC,
      onPressAction: () => {
        secureActions.continueVerificationProcess()
      },
      onCloseAction: () => {},
      pageTitle: 'StartVerificationNotification.PageTitle',
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
  const getCustomNotification = useCallback(
    (id: string | CustomNotificationID): CustomNotificationConfig | undefined => {
      if (id === CustomNotificationID.BCSCStartVerification) {
        return startVerificationNotification()
      }
    },
    [startVerificationNotification]
  )

  return useMemo(
    () => ({
      getCustomNotification,
      startVerificationNotification,
    }),
    [getCustomNotification, startVerificationNotification]
  )
}
