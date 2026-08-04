import { VerificationRequestStatus } from '@/constants'
import { BCDispatchAction } from '@/store'
import { SystemCheckStrategy, SystemCheckUtils } from './system-checks'

/**
 * Recovers a pending in-person or live-call verification (VerificationRequestStatusSystemCheck handles send-video requests)
 * if the app was closed before the app itself detected success (i.e., before "Complete" was pressed)
 */
export class PendingVerificationRecoverySystemCheck implements SystemCheckStrategy {
  private readonly checkVerificationStatus: () => Promise<boolean>
  private readonly utils: SystemCheckUtils

  constructor(checkVerificationStatus: () => Promise<boolean>, utils: SystemCheckUtils) {
    this.checkVerificationStatus = checkVerificationStatus
    this.utils = utils
  }

  async runCheck(): Promise<boolean> {
    return this.checkVerificationStatus()
  }

  onFail() {
    // Not yet verified — noop
  }

  onSuccess() {
    // Set request status to verified to display a CTA to "complete" the verification process
    this.utils.dispatch({
      type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS,
      payload: [VerificationRequestStatus.VERIFIED],
    })
    this.utils.dispatch({
      type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS_MESSAGE,
      payload: [undefined],
    })
  }
}
