import { BCSCModals } from '@/bcsc-theme/types/navigators'
import { IASEnvironment, isProductionBundle, isProductionEnvironment } from '@/utils/environment'
import { SystemCheckNavigation, SystemCheckStrategy, SystemCheckUtils } from './system-checks'

/**
 * Checks if the production app is using the correct environment.
 *
 * Why? Previous versions of the app allowed possible pocket-dial situations where a user could open the Developer settings
 * and change the environment to a non-production environment accidentally. This causes verification requests to end up
 * in a non-production environment.
 */
export class InvalidEnvironmentSystemCheck implements SystemCheckStrategy {
  private readonly environment: IASEnvironment
  private readonly navigation: SystemCheckNavigation
  private readonly utils: SystemCheckUtils

  constructor(environment: IASEnvironment, navigation: SystemCheckNavigation, utils: SystemCheckUtils) {
    this.environment = environment
    this.navigation = navigation
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
    this.utils.logger.debug('[InvalidEnvironmentSystemCheck] Non-production environment detected on production bundle')
    this.navigation.navigate(BCSCModals.InvalidEnvironment)
  }

  onSuccess() {}
}
