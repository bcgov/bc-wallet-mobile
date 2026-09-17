import { isStoredUserMetadataValid } from '@/bcsc-theme/utils/validation'
import { ErrorAlertContextType } from '@/contexts/ErrorAlertContext'
import { AppEventCode } from '@/events/appEventCode'
import { NonBCSCUserMetadata } from '@/store'
import { SystemCheckStrategy, SystemCheckUtils } from './system-checks'

/** The state this check reads, resolved fresh on every read rather than captured at construction. */
export type StoredMetadataState = {
  isVerified: boolean
  userMetadata: NonBCSCUserMetadata | undefined
}

/**
 * Detects NonBCSC name/address metadata that was saved before the app validated those fields —
 * captured by a pre-4.1 app version, or migrated from a V3 install — and would still be rejected
 * by the server today (2111 invalid_parameter) if resubmitted. There is no way to fix the stored
 * value in place, so the only recovery is to restart verification and re-collect it.
 *
 * Because that recovery is destructive, the check reads its state through an accessor and
 * evaluates it twice: once to decide whether to warn, and again before resetting anything.
 *
 * Verified status is checked explicitly rather than inferred from being in the VERIFY scope:
 * RootStack mounts VerifyStack for a *verified* user when `sessionRecoveryRequired` is set
 * (`verified && account && !refreshToken`), and hydration reconstructs `userMetadata` from the
 * stored authorization request whether or not the account is verified — so scope alone does not
 * guarantee an unverified user.
 *
 * @class InvalidStoredMetadataSystemCheck
 * @implements {SystemCheckStrategy}
 */
export class InvalidStoredMetadataSystemCheck implements SystemCheckStrategy {
  constructor(
    private readonly getState: () => StoredMetadataState,
    private readonly emitAlert: ErrorAlertContextType['emitAlert'],
    private readonly restartVerification: () => Promise<void>,
    private readonly utils: SystemCheckUtils
  ) {}

  /** True when there is nothing to recover from: a verified account, or metadata that still validates. */
  private isResetUnnecessary(): boolean {
    const { isVerified, userMetadata } = this.getState()

    return isVerified || isStoredUserMetadataValid(userMetadata)
  }

  runCheck(): boolean {
    return this.isResetUnnecessary()
  }

  onFail() {
    this.utils.logger.warn(
      '[InvalidStoredMetadataSystemCheck] Stored name/address contains characters the server has always rejected; prompting restart'
    )

    this.emitAlert(
      this.utils.translation('Alerts.InvalidStoredMetadata.Title'),
      this.utils.translation('Alerts.InvalidStoredMetadata.Description'),
      {
        event: AppEventCode.INVALID_STORED_METADATA,
        actions: [
          {
            text: this.utils.translation('Alerts.InvalidStoredMetadata.Action1'),
            onPress: () => {
              // The alert stays on screen until it is tapped, and verification can complete while
              // it is up (response listener, pending-verification recovery, token refresh). Re-read
              // rather than trust the runCheck snapshot — this deletes verification progress.
              if (this.isResetUnnecessary()) {
                this.utils.logger.info(
                  '[InvalidStoredMetadataSystemCheck] State changed while the alert was open; skipping reset'
                )
                return
              }

              this.restartVerification()
            },
          },
        ],
      }
    )
  }
}
