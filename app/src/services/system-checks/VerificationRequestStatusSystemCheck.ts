import { VerificationStatusResponseData } from '@/bcsc-theme/api/hooks/useEvidenceApi'
import { BCDispatchAction } from '@/store'
import { SystemCheckStrategy, SystemCheckUtils } from './system-checks'

/**
 * Checks the status of a pending verification request and updates the store.
 *
 * Intended to run on main stack mount and on app foreground. The push notification
 * path (useVerificationResponseListener) writes to the same store field so both
 * paths stay consistent.
 *
 * Only runs when a verificationRequestId is present and the user is not yet verified.
 */
export class VerificationRequestStatusSystemCheck implements SystemCheckStrategy {
  private readonly getVerificationRequestStatus: () => Promise<VerificationStatusResponseData>
  private readonly utils: SystemCheckUtils
  private status: 'pending' | 'cancelled' | null = null
  private statusMessage: string | undefined = undefined

  constructor(getVerificationRequestStatus: () => Promise<VerificationStatusResponseData>, utils: SystemCheckUtils) {
    this.getVerificationRequestStatus = getVerificationRequestStatus
    this.utils = utils
  }

  async runCheck(): Promise<boolean> {
    const { status, status_message } = await this.getVerificationRequestStatus()

    if (status === 'pending' || status === 'cancelled') {
      this.status = status
      this.statusMessage = status_message
      return false
    }

    // 'verified' — no notification needed, request resolved
    return true
  }

  onFail() {
    this.utils.dispatch({
      type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS,
      payload: [this.status],
    })
    this.utils.dispatch({
      type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS_MESSAGE,
      payload: [this.statusMessage],
    })
  }

  onSuccess() {
    this.utils.dispatch({
      type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS,
      payload: [undefined],
    })
    this.utils.dispatch({
      type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS_MESSAGE,
      payload: [undefined],
    })
  }
}
