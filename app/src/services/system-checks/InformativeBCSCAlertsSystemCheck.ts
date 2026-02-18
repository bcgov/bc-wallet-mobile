import { compareCredentialMetadata, tokenToCredentialMetadata } from '@/bcsc-theme/contexts/BCSCIdTokenContext'
import { BCSCModals } from '@/bcsc-theme/types/navigators'
import { BCSCEvent, BCSCReason, IdToken } from '@/bcsc-theme/utils/id-token'
import { AlertOptions } from '@/contexts/ErrorAlertContext'
import { AppEventCode } from '@/events/appEventCode'
import { BCDispatchAction, CredentialMetadata } from '@/store'
import { SystemCheckNavigation, SystemCheckStrategy, SystemCheckUtils } from './system-checks'

/**
 * Checks storage for alert data and displays an alert if data is found.
 *
 * @export
 * @class InformativeBCSCAlertsSystemCheck
 * @implements {SystemCheckStrategy}
 */
export class InformativeBCSCAlertsSystemCheck implements SystemCheckStrategy {
  private readonly navigation: SystemCheckNavigation
  private readonly getIdToken: () => Promise<IdToken>
  private readonly emitAlert: (title: string, bodyx: string, options?: AlertOptions) => void
  private readonly credentialMetadata: CredentialMetadata | undefined
  private readonly utils: SystemCheckUtils
  private event: BCSCEvent | undefined
  private reason: BCSCReason | undefined
  private tokenMetadata: CredentialMetadata | undefined

  constructor(
    getIdToken: () => Promise<IdToken>,
    emitAlert: (title: string, body: string, options?: AlertOptions) => void,
    metadata: CredentialMetadata | undefined,
    utils: SystemCheckUtils,
    navigation: SystemCheckNavigation
  ) {
    this.getIdToken = getIdToken
    this.emitAlert = emitAlert
    this.utils = utils
    this.credentialMetadata = metadata
    this.navigation = navigation
  }

  async runCheck(): Promise<boolean> {
    const token = await this.getIdToken()
    this.tokenMetadata = tokenToCredentialMetadata(token)
    this.event = token.bcsc_event
    this.reason = token.bcsc_reason

    // if the event is a cancel, this app will need to be reset, no
    if (token.bcsc_event === BCSCEvent.Cancel) {
      return false
    }

    // Compare new and stored credential metadata
    const isMetadataTheSame = compareCredentialMetadata(this.tokenMetadata, this.credentialMetadata)

    // If stored metadata and current token metadata are different, update the stored metadata
    if (!isMetadataTheSame) {
      // update stored metadata
      this.utils.dispatch({ type: BCDispatchAction.UPDATE_CREDENTIAL_METADATA, payload: [this.tokenMetadata] })
    }

    return isMetadataTheSame
  }

  onFail() {
    if (!this.event || !this.reason) {
      return
    }

    switch (this.reason) {
      case BCSCReason.Cancel:
        this.navigation.navigate(BCSCModals.DeviceInvalidated, { invalidationReason: this.reason })
        break
      case BCSCReason.Renew:
        this.alertBuilder(AppEventCode.CARD_STATUS_UPDATED)
        break
      case BCSCReason.Replace:
        this.alertBuilder(AppEventCode.CARD_TYPE_CHANGED)
        break
      default:
        break
    }
  }

  onSuccess() {
    // nothing to alert
  }

  // helper function for building the alert to emit
  alertBuilder(eventCode: AppEventCode) {
    this.emitAlert(
      this.utils.translation('Alerts.AccountUpdated.Title'),
      this.utils.translation('Alerts.AccountUpdated.Description'),
      {
        event: eventCode,
        actions: [
          {
            text: this.utils.translation('Alerts.Actions.DefaultOK'),
            style: 'cancel',
          },
        ],
      }
    )
  }
}
