import { compareCredentialMetadata, tokenToCredentialMetadata } from '@/bcsc-theme/contexts/BCSCIdTokenContext'
import { BCSCModals } from '@/bcsc-theme/types/navigators'
import { BCSCEvent, BCSCReason, IdToken } from '@/bcsc-theme/utils/id-token'
import { AlertOptions } from '@/contexts/ErrorAlertContext'
import { AppEventCode } from '@/events/appEventCode'
import { BCDispatchAction, CredentialMetadata } from '@/store'
import { SystemCheckNavigation, SystemCheckStrategy, SystemCheckUtils } from './system-checks'

/**
 * Checks token metadata and renders a modal or alert
 * Reasons:
 * Cancel
 *  - displays a modal instructing user to reset their app; the saved event also marks the card inactive
 *
 * Expire:
 *  - saved with the account details, which is what marks the card inactive; no alert (see IASP-12489)
 *
 * Renew:
 *  - emits an alert informing the user their information has been updated
 *
 * Replace:
 *  - emits an alert informing the user their card type has changed
 *
 * Details saved before the event was kept, or whose event alone changed, are saved again without an alert.
 *
 * @export
 * @class EventReasonAlertsSystemCheck
 * @implements {SystemCheckStrategy}
 */
export class EventReasonAlertsSystemCheck implements SystemCheckStrategy {
  private readonly navigation: SystemCheckNavigation
  private readonly getIdToken: () => Promise<IdToken>
  private readonly emitAlert: (title: string, body: string, options?: AlertOptions) => void
  private readonly credentialMetadata: CredentialMetadata | undefined
  private readonly utils: SystemCheckUtils
  private event: BCSCEvent | undefined
  private reason: BCSCReason | undefined
  private tokenMetadata: CredentialMetadata | undefined
  private readonly readCurrentMetadata: () => CredentialMetadata | undefined

  constructor(
    getIdToken: () => Promise<IdToken>,
    emitAlert: (title: string, body: string, options?: AlertOptions) => void,
    metadata: CredentialMetadata | undefined,
    utils: SystemCheckUtils,
    navigation: SystemCheckNavigation,
    // The batch resolves after its slowest check, so a reset can clear the saved details before onSuccess
    // runs; the snapshot above would then overwrite that clear
    readCurrentMetadata: () => CredentialMetadata | undefined = () => metadata
  ) {
    this.getIdToken = getIdToken
    this.emitAlert = emitAlert
    this.utils = utils
    this.credentialMetadata = metadata
    this.navigation = navigation
    this.readCurrentMetadata = readCurrentMetadata
  }

  async runCheck(): Promise<boolean> {
    const token = await this.getIdToken()
    this.tokenMetadata = tokenToCredentialMetadata(token)
    this.event = token.bcsc_event
    this.reason = token.bcsc_reason

    // if the event is a cancel, this app will need to be reset, no need to continue
    if (token.bcsc_event === BCSCEvent.Cancel) {
      return false
    }

    // Compare new and stored credential metadata
    return compareCredentialMetadata(this.tokenMetadata, this.credentialMetadata)
  }

  onFail() {
    if (!this.event || !this.reason) {
      return
    }

    // update the credential metadata
    this.utils.dispatch({ type: BCDispatchAction.UPDATE_CREDENTIAL_METADATA, payload: [this.tokenMetadata] })

    switch (this.event) {
      case BCSCEvent.Cancel:
        this.navigation.navigate(BCSCModals.DeviceInvalidated, { invalidationReason: this.reason })
        break
      case BCSCEvent.Expire:
        // Login, pairing, and Services, will only be usable in emergency mode, but don't force reverification
        break
      case BCSCEvent.Renewal:
        this.alertBuilder(AppEventCode.CARD_STATUS_UPDATED)
        break
      case BCSCEvent.Replace:
        this.alertBuilder(AppEventCode.CARD_TYPE_CHANGED)
        break
      default:
        break
    }
  }

  onSuccess() {
    // No alert, but backfill a missing or changed saved event: isCardInactive reads it. Only while the
    // saved details still exist and match the token apart from the event.
    const saved = this.readCurrentMetadata()
    if (
      this.tokenMetadata &&
      saved?.bcscEvent !== this.tokenMetadata.bcscEvent &&
      compareCredentialMetadata(this.tokenMetadata, saved)
    ) {
      this.utils.dispatch({ type: BCDispatchAction.UPDATE_CREDENTIAL_METADATA, payload: [this.tokenMetadata] })
    }
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
