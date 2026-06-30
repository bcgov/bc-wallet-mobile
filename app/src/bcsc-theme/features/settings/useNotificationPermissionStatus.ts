import * as PushNotifications from '@/utils/PushNotificationsHelper'
import { useFocusEffect } from '@react-navigation/native'
import { useCallback, useEffect, useState } from 'react'
import { AppState } from 'react-native'

interface NotificationPermissionStatusResult {
  /** The current OS notification permission status. */
  status: PushNotifications.NotificationPermissionStatus
  /** Re-reads the OS permission status on demand (e.g. after requesting permission). */
  refresh: () => Promise<void>
}

/**
 * Tracks the device-level (OS) notification permission status.
 *
 * Refreshes when the screen regains focus (e.g. returning from the notification
 * settings sub-screen) and when the app returns to the foreground (e.g. returning
 * from the OS Settings app), so callers reflect changes the user makes outside the app.
 * Also exposes a manual `refresh` for callers that change the permission in-app.
 *
 * @returns {NotificationPermissionStatusResult} The current status and a manual refresh callback.
 */
export const useNotificationPermissionStatus = (): NotificationPermissionStatusResult => {
  const [status, setStatus] = useState<PushNotifications.NotificationPermissionStatus>(
    PushNotifications.NotificationPermissionStatus.UNKNOWN
  )

  const refresh = useCallback(async () => {
    setStatus(await PushNotifications.status())
  }, [])

  // Initial read on mount, plus a refresh when the app returns to the foreground
  // (e.g. back from the OS Settings app).
  useEffect(() => {
    refresh()

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        refresh()
      }
    })

    return () => subscription.remove()
  }, [refresh])

  // Refresh when the screen regains focus (e.g. returning from the notification settings sub-screen).
  useFocusEffect(
    useCallback(() => {
      refresh()
    }, [refresh])
  )

  return { status, refresh }
}
