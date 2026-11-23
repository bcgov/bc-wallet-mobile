import { RegistrationResponseData } from '@/bcsc-theme/api/hooks/useRegistrationApi'
import { getBCSCState } from '@/bcsc-theme/storage/hooks'
import { isAppError } from '@/errors/appError'
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
    // Force update if stored values are blank (v3→v4 upgrade or first run)
    if (!this.lastAppVersion || !this.lastAppBuildNumber) {
      return false
    }

    return this.lastAppVersion === getVersion() && this.lastAppBuildNumber === getBuildNumber()
  }

  async onFail() {
    const reason =
      !this.lastAppVersion || !this.lastAppBuildNumber
        ? 'missing stored version/build (first run or upgrade)'
        : 'version/build change'
    this.utils.logger.info(`UpdateDeviceRegistrationSystemCheck: Updating device registration due to ${reason}`)

    try {
      await this.updateRegistration()

      await getBCSCState().app.update({ appVersion: getVersion(), appBuildNumber: getBuildNumber() })
    } catch (error) {
      // This catch is the only trace the automatic update leaves (no modal on
      // this path), and the problem-report view surfaces only the message text —
      // so fold fullMessage (registry message + Debug tag + native detail) into
      // the message itself. toJSON() rides along as structured data for
      // pipelines that can display it.
      const detail = isAppError(error) ? `: ${error.fullMessage}` : ''
      this.utils.logger.error(
        `UpdateDeviceRegistrationSystemCheck: Failed to update device registration${detail}`,
        isAppError(error) ? error.toJSON() : (error as Error)
      )
    }
  }
}
