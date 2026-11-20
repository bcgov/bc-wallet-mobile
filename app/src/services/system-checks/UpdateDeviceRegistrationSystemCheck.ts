import { RegistrationResponseData } from '@/bcsc-theme/api/hooks/useRegistrationApi'
import { isAppError } from '@/errors/appError'
import { BCDispatchAction } from '@/store'
import { AppBuild } from '@/utils/app-build'
import { getBuildNumber, getVersion } from 'react-native-device-info'
import { SystemCheckStrategy, SystemCheckUtils } from './system-checks'

type UpdateRegistrationFunction = () => Promise<RegistrationResponseData>

/**
 * Checks conditions to determine if the device registration needs to be updated.
 *
 * Currently supports:
 *    - The running build differs from the last registered build (new build, failed earlier update, or v3→v4 upgrade)
 *
 * @class UpdateDeviceRegistrationSystemCheck
 * @implements {SystemCheckStrategy}
 */
export class UpdateDeviceRegistrationSystemCheck implements SystemCheckStrategy {
  private readonly registeredBuild: AppBuild | undefined
  private readonly updateRegistration: UpdateRegistrationFunction
  private readonly utils: SystemCheckUtils

  constructor(
    registeredBuild: AppBuild | undefined,
    updateRegistration: UpdateRegistrationFunction,
    utils: SystemCheckUtils
  ) {
    this.registeredBuild = registeredBuild
    this.utils = utils
    this.updateRegistration = updateRegistration
  }

  runCheck() {
    // The registered build only advances after the PUT succeeds, so a failed update retries on the next launch
    return this.registeredBuild?.version === getVersion() && this.registeredBuild.build === getBuildNumber()
  }

  async onFail() {
    this.utils.logger.info(
      'UpdateDeviceRegistrationSystemCheck: Updating device registration, build differs from the registered one'
    )

    try {
      await this.updateRegistration()

      this.utils.dispatch({ type: BCDispatchAction.SET_REGISTERED_BUILD })
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
