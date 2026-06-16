import { BCSCModals } from '@/bcsc-theme/types/navigators'
import { getAuthorizationRequest } from 'react-native-bcsc-core'
import { SystemCheckNavigation, SystemCheckStrategy, SystemCheckUtils } from './system-checks'

/**
 * Checks whether an in-progress identity verification session has expired.
 *
 * During verification the app holds a short-lived `device_code` (the "verification-in-progress"
 * credential issued before the long-lived tokens) with a server-set TTL of ~7 days. If the user
 * pauses partway through and returns after that window lapses, the code is dead and every evidence
 * call 401s — historically dead-ending on the generic error modal. This check detects the lapse on
 * startup and routes the user to a blocking screen that resets the app so they can start again.
 *
 * The check passes (no action) when the user is already verified, or when there is no pending
 * `device_code`. It fails (→ onFail) only when an unverified user is holding a `device_code` whose
 * expiry is in the past.
 *
 * @see {VerificationSessionExpired.tsx} for the modal displayed on failure.
 *
 * @class VerificationSessionExpiredSystemCheck
 * @implements {SystemCheckStrategy}
 */
export class VerificationSessionExpiredSystemCheck implements SystemCheckStrategy {
  private readonly getDeviceCodeExpiry: () => Promise<Date | null>
  private readonly isVerified: boolean
  private readonly navigation: SystemCheckNavigation
  private readonly utils: SystemCheckUtils
  private readonly now: Date

  /**
   * @param getDeviceCodeExpiry Resolves the pending device_code's expiry (read from native storage to
   *   avoid the startup hydration race), or null when there is no pending code.
   * @param isVerified Whether the user is already verified (best-effort guard; verified flows clear
   *   the device_code so getDeviceCodeExpiry already returns null for them).
   * @param navigation Navigation used to route to the expired-session modal on failure.
   * @param utils Shared system-check utilities (logger, dispatch, translation).
   * @param now Current time (injectable for testing).
   */
  constructor(
    getDeviceCodeExpiry: () => Promise<Date | null>,
    isVerified: boolean,
    navigation: SystemCheckNavigation,
    utils: SystemCheckUtils,
    now: Date = new Date()
  ) {
    this.getDeviceCodeExpiry = getDeviceCodeExpiry
    this.isVerified = isVerified
    this.navigation = navigation
    this.utils = utils
    this.now = now
  }

  /**
   * Runs the check to verify the in-progress verification session has not expired.
   *
   * @returns {*} {Promise<boolean>} - true if the session is valid or not applicable, false if expired.
   */
  async runCheck(): Promise<boolean> {
    // Verified users have no pending device_code to expire.
    if (this.isVerified) {
      return true
    }

    try {
      const expiry = await this.getDeviceCodeExpiry()

      // No pending device_code means there is no in-progress session to expire.
      if (!expiry) {
        return true
      }

      const expired = expiry.getTime() <= this.now.getTime()

      this.utils.logger.info('VerificationSessionExpiredSystemCheck', {
        deviceCodeExpiresAt: expiry.toISOString(),
        now: this.now.toISOString(),
        expired,
      })

      return !expired
    } catch (error) {
      // Non-blocking: a native-storage read failure must not reject runSystemChecks' Promise.all,
      // which would skip every other startup check's failure handling. Treat the session as valid.
      this.utils.logger.warn(
        '[VerificationSessionExpiredSystemCheck] Failed to read device_code expiry; treating session as valid',
        { error }
      )
      return true
    }
  }

  /**
   * Handles failure by routing to the verification session expired modal.
   *
   * @returns {*} {void}
   */
  onFail() {
    this.utils.logger.warn(
      '[VerificationSessionExpiredSystemCheck] Verification session (device_code) expired, routing to restart'
    )
    return this.navigation.navigate(BCSCModals.VerificationSessionExpired)
  }
}

/**
 * Reads the pending verification session's `device_code` expiry from native storage.
 *
 * Returns null when there is no pending `device_code` (i.e. no in-progress verification); otherwise the
 * expiry as a Date (native persists it as a Unix-seconds timestamp). Reads from native storage rather
 * than the Redux store so it is available before secure state is hydrated during startup checks.
 *
 * @returns {*} {Promise<Date | null>} The pending device_code expiry, or null when none is pending.
 */
export async function getPendingDeviceCodeExpiry(): Promise<Date | null> {
  const authRequest = await getAuthorizationRequest()
  if (!authRequest?.deviceCode || !authRequest.expiry) {
    return null
  }
  return new Date(authRequest.expiry * 1000)
}
