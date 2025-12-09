import { AlertEvent } from '@/events/alertEvents'
import { Analytics } from '@/utils/analytics/analytics-tracker'
import i18n from 'i18next'
import { Alert, AlertButton } from 'react-native'

const ALERT_ACTION_OK: AlertAction = { text: i18n.t('Alerts.Actions.DefaultOK'), onPress: () => {} }

// Function type for rendering alerts
type RenderAlertFn = (title: string, body: string, actions?: AlertAction[]) => void

// Extends AlertButton to require text property
type AlertAction = AlertButton & { text: string }

/**
 * Displays an alert based on the specified AlertEvent and tracks the event using Analytics.
 *
 * TODO (MD): Consider encapsulating this functionality into a context provider.
 * This will allow an easier transition into custom alert components in the future.
 *
 * Note: This function assumes that the i18n translation files
 * contain the necessary entries for the alert titles and bodies.
 *
 * @example
 * Alerts.add_card_camera_broken.Title = "Camera Not Working"
 * Alerts.add_card_camera_broken.Body = "Please check your camera settings and try again."
 *
 * @param {AlertEvent} event - The alert event to display.
 * @param {AlertAction[]} [actions=[ALERT_ACTION_OK]] - Optional array of AlertButton actions. If not provided, a default 'OK' button will be used.
 * @param {RenderAlertFn} [renderAlert=Alert.alert] - Optional function to render the alert. Defaults to React Native's Alert.alert.
 * @returns {*} {void}
 */
export const showAlert = (
  event: AlertEvent,
  actions: AlertAction[] = [ALERT_ACTION_OK],
  renderAlert: RenderAlertFn = Alert.alert
) => {
  /**
   * I think we can get away with using the i18n translation (t) function directly here
   * as native alerts will not re-render on language change without re-displaying the alert.
   */
  const title = i18n.t(`Alerts.${event.toLowerCase()}.Title`)
  const body = i18n.t(`Alerts.${event.toLowerCase()}.Body`)

  const buttons = actions.map((action) => {
    return {
      ...action,
      onPress: () => {
        if (action.onPress) {
          action.onPress()

          // Track the alert action event when a button is pressed
          Analytics.trackAlertActionEvent(event, action.text)
        }
      },
    }
  })

  renderAlert(title, body, buttons)

  // Track the alert display event
  Analytics.trackAlertDisplayEvent(event)
}
