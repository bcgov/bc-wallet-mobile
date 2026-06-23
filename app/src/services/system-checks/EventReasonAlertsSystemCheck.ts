import { compareCredentialMetadata, tokenToCredentialMetadata } from '@/bcsc-theme/contexts/BCSCIdTokenContext'
import { BCSCModals } from '@/bcsc-theme/types/navigators'
import { BCSCEvent, BCSCReason, IdToken } from '@/bcsc-theme/utils/id-token'
import { BCDispatchAction, CredentialMetadata } from '@/store'
import { SystemCheckNavigation, SystemCheckStrategy, SystemCheckUtils } from './system-checks'

/**
 * Checks token metadata and renders a modal or notification
 * Reasons:
 * Cancel
 *  - displays a modal instructing user to reset their app
 * Renew:
 *  - dispatches SET_CARD_RENEWAL_NOTIFICATION to show a home screen renewal prompt
 * Replace:
 *  - dispatches SET_ACCOUNT_EXPIRY_NOTIFICATION to show a home screen re-verification prompt
 *
 * @export
 * @class EventReasonAlertsSystemCheck
 * @implements {SystemCheckStrategy}
 */
export class EventReasonAlertsSystemCheck implements SystemCheckStrategy {
  private readonly navigation: SystemCheckNavigation
  private readonly getIdToken: () => Promise<IdToken>
  private readonly credentialMetadata: CredentialMetadata | undefined
  private readonly utils: SystemCheckUtils
  private event: BCSCEvent | undefined
  private reason: BCSCReason | undefined
  private tokenMetadata: CredentialMetadata | undefined

  constructor(
    getIdToken: () => Promise<IdToken>,
    metadata: CredentialMetadata | undefined,
    utils: SystemCheckUtils,
    navigation: SystemCheckNavigation
  ) {
    this.getIdToken = getIdToken
    this.utils = utils
    this.credentialMetadata = metadata
    this.navigation = navigation
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
    const isMetadataTheSame = compareCredentialMetadata(this.tokenMetadata, this.credentialMetadata)

    return isMetadataTheSame
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
      case BCSCEvent.Renewal:
        this.utils.dispatch({ type: BCDispatchAction.SET_CARD_RENEWAL_NOTIFICATION, payload: [true] })
        break
      case BCSCEvent.Replace:
        this.utils.dispatch({ type: BCDispatchAction.SET_ACCOUNT_EXPIRY_NOTIFICATION, payload: [true] })
        break
      default:
        break
    }
  }

  onSuccess() {
    // nothing to notify
  }
}
