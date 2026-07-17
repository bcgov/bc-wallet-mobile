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
  private readonly checkDeviceCodeStatus: () => Promise<unknown>
  private readonly utils: SystemCheckUtils
  private status: 'pending' | 'cancelled' | 'verified' | null = null
  private statusMessage: string | undefined = undefined

  constructor(
    getVerificationRequestStatus: () => Promise<VerificationStatusResponseData>,
    checkDeviceCodeStatus: () => Promise<unknown>,
    utils: SystemCheckUtils
  ) {
    this.getVerificationRequestStatus = getVerificationRequestStatus
    this.checkDeviceCodeStatus = checkDeviceCodeStatus
    this.utils = utils
  }

  async runCheck(): Promise<boolean> {
    const { status, status_message } = await this.getVerificationRequestStatus()

    if (status === 'pending' || status === 'cancelled') {
      this.status = status
      this.statusMessage = status_message
      return false
    }

    // 'verified' — mirror the push notification path (useVerificationResponseListener):
    // exchange the device code for real tokens before reporting success. If this throws,
    // the check is treated as inconclusive (logged, not marked verified) and retried on
    // the next run rather than silently clearing the pending state without real tokens.
    await this.checkDeviceCodeStatus()
    this.status = 'verified'
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
    // Setting status to 'verified' (rather than clearing it) surfaces the VerifiedNotification
    // banner on Home, same as the push notification path — the user taps through from there to
    // VerificationSuccessScreen to complete account setup (updateVerified, registration, etc).
    this.utils.dispatch({
      type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS,
      payload: [this.status],
    })
    this.utils.dispatch({
      type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS_MESSAGE,
      payload: [undefined],
    })
  }
}
