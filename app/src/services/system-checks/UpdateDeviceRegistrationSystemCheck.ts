import { RegistrationResponseData } from '@/bcsc-theme/api/hooks/useRegistrationApi'
import { BCDispatchAction } from '@/store'
import { getBuildNumber, getVersion } from 'react-native-device-info'
import { SystemCheckStrategy, SystemCheckUtils } from './system-checks'

type UpdateRegistrationFunction = () => Promise<RegistrationResponseData>

/**
 * Checks conditions to determine if the device registration needs to be updated.
 *
 * Currently supports:
 *    - App version or build number mismatch
 *    - Blank stored values (v3→v4 upgrade or first run)
 *
 * @class UpdateDeviceRegistrationSystemCheck
 * @implements {SystemCheckStrategy}
 */
export class UpdateDeviceRegistrationSystemCheck implements SystemCheckStrategy {
  private readonly lastAppVersion: string
  private readonly lastAppBuildNumber: string
  private readonly updateRegistration: UpdateRegistrationFunction
  private readonly utils: SystemCheckUtils

  constructor(
    lastAppVersion: string,
    lastAppBuildNumber: string,
    updateRegistration: UpdateRegistrationFunction,
    utils: SystemCheckUtils
  ) {
    this.lastAppVersion = lastAppVersion
    this.lastAppBuildNumber = lastAppBuildNumber
    this.utils = utils
    this.updateRegistration = updateRegistration
  }

  runCheck() {
    const currentVersion = getVersion()
    const currentBuild = getBuildNumber()

    this.utils.logger.info(
      `[DEBUG] UpdateDeviceRegistrationSystemCheck: stored=${this.lastAppVersion}(${this.lastAppBuildNumber}) current=${currentVersion}(${currentBuild})`
    )

    // Force update if stored values are blank (v3→v4 upgrade or first run)
    if (!this.lastAppVersion || !this.lastAppBuildNumber) {
      return false
    }

    return this.lastAppVersion === currentVersion && this.lastAppBuildNumber === currentBuild
  }

  async onFail() {
    this.utils.logger.info('UpdateDeviceRegistrationSystemCheck: Updating device registration due to version/build change')

    try {
      await this.updateRegistration()

      this.utils.dispatch({ type: BCDispatchAction.UPDATE_APP_VERSION })
    } catch (error) {
      this.utils.logger.error(
        'UpdateDeviceRegistrationSystemCheck: Failed to update device registration',
        error as Error
      )
    }
  }
}
