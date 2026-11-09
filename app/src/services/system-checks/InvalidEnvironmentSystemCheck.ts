import { IASEnvironment, isProductionBundle, isProductionEnvironment } from '@/utils/environment'
import { SystemCheckStrategy, SystemCheckUtils } from './system-checks'

/**
 * Checks if the app is running in a production bundle and if the environment stored in local storage is valid for production.
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
      // If the app is not runnin a production bundle, this check does not apply
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
