import { IASEnvironment, isProductionBundle, isProductionEnvironment } from '@/utils/environment'
import { SystemCheckStrategy, SystemCheckUtils } from './system-checks'

/**
 * Checks if the production app is using the correct environment.
 *
 * Why? Previous versions of the app allowed possible pocket-dial situations where a user could open the Developer settings
 * and change the environment to a non-production environment accidentally. This causes verification requests to end up
 * in a non-production environment.
 */
export class InvalidEnvironmentSystemCheck implements SystemCheckStrategy {
  private readonly environment: IASEnvironment
  private readonly invalidEnvironmentErrorModal: () => void
  private readonly utils: SystemCheckUtils

  constructor(environment: IASEnvironment, invalidEnvironmentErrorModal: () => void, utils: SystemCheckUtils) {
    this.environment = environment
    this.invalidEnvironmentErrorModal = invalidEnvironmentErrorModal
    this.utils = utils
  }

  async runCheck() {
    if (!isProductionBundle()) {
      // If the app is not running a production bundle, this check does not apply
      return true
    }

    // If the app is running in a production bundle, check if the environment is valid for production
    return isProductionEnvironment(this.environment)
  }

  onFail() {
    this.utils.logger.debug(
      '[InvalidProductionEnvironmentSystemCheck] Invalid environment detected for production. Switching to production environment.'
    )
    this.invalidEnvironmentErrorModal()
  }

  onSuccess() {}
}
