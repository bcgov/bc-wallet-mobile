import { BCSCReason } from '@/bcsc-theme/utils/id-token'
import { AlertOptions } from '@/contexts/ErrorAlertContext'
import { AppEventCode } from '@/events/appEventCode'
import { BCDispatchAction, BCSCAlertEvent } from '@/store'
import { SystemCheckStrategy, SystemCheckUtils } from './system-checks'

/**
 * Checks storage for alert data and displays an alert if data is found.
 *
 * @export
 * @class InformativeBCSCAlertsSystemCheck
 * @implements {SystemCheckStrategy}
 */

export class InformativeBCSCAlertsSystemCheck implements SystemCheckStrategy {
  private readonly alertReasoning: BCSCAlertEvent | undefined
  private readonly emitAlert: (title: string, body: string, options?: AlertOptions) => void
  private readonly utils: SystemCheckUtils

  constructor(
    alertReasoning: BCSCAlertEvent | undefined,
    emitAlert: (title: string, body: string, options?: AlertOptions) => void,
    utils: SystemCheckUtils
  ) {
    this.alertReasoning = alertReasoning
    this.emitAlert = emitAlert
    this.utils = utils
  }

  async runCheck(): Promise<boolean> {
    return !this.alertReasoning
  }

  onFail() {
    let eventCode: AppEventCode = AppEventCode.GENERAL
    if (this.alertReasoning?.reason === BCSCReason.Renew) {
      eventCode = AppEventCode.CARD_STATUS_UPDATED
    }
    if (this.alertReasoning?.reason === BCSCReason.Replace) {
      eventCode = AppEventCode.CARD_TYPE_CHANGED
    }
    this.emitAlert(
      this.utils.translation('Alerts.AccountUpdated.Title'),
      this.utils.translation('Alerts.AccountUpdated.Description'),
      {
        event: eventCode,
        actions: [
          {
            text: this.utils.translation('Alerts.Actions.DefaultOk'),
            style: 'cancel',
            onPress: () => {
              // clear the alert reasoning so that the alert doesn't show again until new data is received
              this.utils.dispatch({ type: BCDispatchAction.ALERT_REASONING, payload: undefined })
            },
          },
        ],
      }
    )
  }

  onSuccess() {
    // nothing to alert
  }
}
