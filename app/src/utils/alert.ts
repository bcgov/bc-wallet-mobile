import { AlertEvent } from '@/events/alertEvents'
import i18n from 'i18next'
import { Alert, AlertButton } from 'react-native'
import { Analytics } from './analytics/analytics-singleton'

// Extends AlertButton to require text property
export type AlertAction = AlertButton & { text: string }

// Default OK action - evaluated at call time to get current translation
const getDefaultOkAction = (): AlertAction => ({
  text: i18n.t('Global.Okay'),
  onPress: () => {},
})

/**
 * Displays a native alert with pre-translated title and body.
 * Use this when you have already translated the strings.
 *
 * @param title - The alert title (already translated)
 * @param body - The alert body/message (already translated)
 * @param actions - Optional array of AlertButton actions. If not provided, a default 'OK' button will be used.
 * @param event - Optional AlertEvent for analytics tracking
 */
export const showAlert = (title: string, body: string, actions?: AlertAction[], event?: AlertEvent): void => {
  const buttons = (actions ?? [getDefaultOkAction()]).map((action) => ({
    ...action,
    onPress: () => {
      action.onPress?.()
      if (event) {
        Analytics.trackAlertActionEvent(event, action.text)
      }
    },
  }))

  Alert.alert(title, body, buttons)

  if (event) {
    Analytics.trackAlertDisplayEvent(event)
  }
}
