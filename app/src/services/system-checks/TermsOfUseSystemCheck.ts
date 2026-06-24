import { TermsOfUseResponseData } from '@/bcsc-theme/api/hooks/useConfigApi'
import { BCSCModals } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction } from '@/store'
import { SystemCheckNavigation, SystemCheckStrategy, SystemCheckUtils } from './system-checks'

/**
 * Checks if the user has accepted the latest Terms of Use version from the server.
 *
 * Rules (in logical order):
 *
 *   Pass:
 *    A. Terms of Use fetch fails (fail open, do not block the user on a server issue)
 *    B. No accepted version is recorded (existing user from before tracking was added);
 *       the current server version is seeded as accepted via onSuccess (grandfathering)
 *    C. Accepted version matches the server version
 *
 *   Fail:
 *    A. Accepted version differs from the server version => user must re-accept
 *
 * @see {TermsOfUseUpdated.tsx} for the blocking modal displayed on failure.
 *
 * @class TermsOfUseSystemCheck
 * @implements {SystemCheckStrategy}
 */
export class TermsOfUseSystemCheck implements SystemCheckStrategy {
  private readonly getTermsOfUse: () => Promise<TermsOfUseResponseData>
  private readonly acceptedVersion: string | undefined
  private readonly navigation: SystemCheckNavigation
  private readonly utils: SystemCheckUtils
  private fetchedVersion: string | undefined

  constructor(
    getTermsOfUse: () => Promise<TermsOfUseResponseData>,
    acceptedVersion: string | undefined,
    navigation: SystemCheckNavigation,
    utils: SystemCheckUtils
  ) {
    this.getTermsOfUse = getTermsOfUse
    this.acceptedVersion = acceptedVersion
    this.navigation = navigation
    this.utils = utils
  }

  /**
   * Runs the terms of use check to verify the user has accepted the latest server version.
   *
   * @returns {Promise<boolean>} - A promise that resolves to true if no re-acceptance is needed, false otherwise.
   */
  async runCheck() {
    try {
      const termsOfUse = await this.getTermsOfUse()
      this.fetchedVersion = String(termsOfUse.version)
    } catch (error) {
      this.utils.logger.error(
        'TermsOfUseSystemCheck: Terms of Use request failed',
        error instanceof Error ? error : new Error(String(error))
      )
      // Fail open: do not block or re-prompt the user when the terms cannot be fetched
      return true
    }

    this.utils.logger.info('TermsOfUseSystemCheck', {
      acceptedVersion: this.acceptedVersion,
      serverVersion: this.fetchedVersion,
    })

    // No recorded acceptance (user onboarded before tracking existed): pass and
    // seed the current server version in onSuccess instead of re-prompting
    if (this.acceptedVersion === undefined) {
      return true
    }

    return String(this.acceptedVersion) === this.fetchedVersion
  }

  /**
   * Handles the failure of the terms of use check by displaying the blocking re-acceptance modal.
   *
   * @returns {*} {void}
   */
  onFail() {
    this.navigation.navigate(BCSCModals.TermsOfUseUpdated)
  }

  /**
   * Handles the success of the terms of use check by seeding the accepted version
   * for users who onboarded before acceptance tracking existed (grandfathering).
   *
   * @returns {*} {void}
   */
  onSuccess() {
    // Only seed when nothing was recorded and the fetch succeeded, to avoid
    // a redundant storage write on every check
    if (this.acceptedVersion === undefined && this.fetchedVersion !== undefined) {
      this.utils.dispatch({
        type: BCDispatchAction.UPDATE_ACCEPTED_TERMS_OF_USE_VERSION,
        payload: [this.fetchedVersion],
      })
    }
  }
}
