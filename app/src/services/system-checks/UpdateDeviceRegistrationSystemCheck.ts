import { RegistrationResponseData } from '@/bcsc-theme/api/hooks/useRegistrationApi'
import { BCDispatchAction } from '@/store'
import { getVersion } from 'react-native-device-info'
import { SystemCheckStrategy, SystemCheckUtils } from './system-checks'

type UpdateRegistrationFunction = () => Promise<RegistrationResponseData>

/**
 * Checks conditions to determine if the device registration needs to be updated.
 *
 * Currently supports:
 *    - App version mismatch (previously registered app version differs from current app version)
 *
 * @class UpdateDeviceRegistrationSystemCheck
 * @implements {SystemCheckStrategy}
 */
export class UpdateDeviceRegistrationSystemCheck implements SystemCheckStrategy {
  private readonly lastAppVersion: string
  private readonly updateRegistration: UpdateRegistrationFunction
  private readonly utils: SystemCheckUtils

  constructor(lastAppVersion: string, updateRegistration: UpdateRegistrationFunction, utils: SystemCheckUtils) {
    this.lastAppVersion = lastAppVersion
    this.utils = utils
    this.updateRegistration = updateRegistration
  }

  /**
   * Runs the device registration update check to verify if the device registration needs to be updated.
   *
   * @returns {*} {boolean} - A boolean indicating if the device registration is up to date.
   */
  runCheck() {
    return this.lastAppVersion === getVersion()
  }

  /**
   * Handles the failure case where the device registration needs to be updated.
   *
   * @returns {*} {Promise<void>} - A promise that resolves when the device registration update process is complete.
   */
  async onFail() {
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
