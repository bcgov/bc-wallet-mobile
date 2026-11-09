import { BCLocalStorageKeys } from '@/store'
import { IASEnvironment, isProductionBundle } from '@/utils/environment'
import { PersistentStorage } from '@bifold/core'
import { SystemCheckStrategy, SystemCheckUtils } from './system-checks'

/**
 * Checks if the app is running in a production bundle and if the environment stored in local storage is valid for production.
 */
export class InvalidEnvironmentSystemCheck implements SystemCheckStrategy {
  private readonly invalidEnvironmentErrorModal: () => void
  private readonly utils: SystemCheckUtils

  constructor(invalidEnvironmentErrorModal: () => void, utils: SystemCheckUtils) {
    this.invalidEnvironmentErrorModal = invalidEnvironmentErrorModal
    this.utils = utils
  }

  async runCheck() {
    if (!isProductionBundle()) {
      // If the app is not runnin a production bundle, this check does not apply
      return true
    }

    const environment = await PersistentStorage.fetchValueForKey<IASEnvironment>(BCLocalStorageKeys.Environment)

    if (!environment) {
      this.utils.logger.debug(
        '[InvalidProductionEnvironmentSystemCheck] No environment set in storage, assuming valid for production.'
      )
      // If the environment is not set, we assume it's valid for production.
      return true
    }

    return environment.iasApiBaseUrl === IASEnvironment.PROD.iasApiBaseUrl
  }

  onFail() {
    this.utils.logger.debug(
      '[InvalidProductionEnvironmentSystemCheck] Invalid environment detected for production. Switching to production environment.'
    )
    this.invalidEnvironmentErrorModal()
  }

  onSuccess() {}
}
