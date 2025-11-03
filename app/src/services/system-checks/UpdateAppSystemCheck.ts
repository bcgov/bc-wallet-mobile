import { ServerStatusResponseData } from '@/bcsc-theme/api/hooks/useConfigApi'
import { SystemCheckStrategy, SystemCheckUtils } from './system-checks'
import { BCDispatchAction } from '@/store'
import { BCSCBanner } from '@/bcsc-theme/components/AppBanner'

/**
 * Checks if the app version meets the minimum required version.
 *
 * @class UpdateAppSystemCheck
 * @implements {SystemCheckStrategy}
 */
export class UpdateAppSystemCheck implements SystemCheckStrategy {
  private readonly serverStatus: ServerStatusResponseData
  private readonly appVersion: string
  private readonly utils: SystemCheckUtils

  constructor(serverStatus: ServerStatusResponseData, appVersion: string, utils: SystemCheckUtils) {
    this.serverStatus = serverStatus
    this.appVersion = appVersion
    this.utils = utils
  }

  /**
   * Compares two semantic versions to determine order.
   *
   * Rules:
   *     3.0.0 > 2.9.9 because '3' > '2'
   *     3.1.0 > 3.0.9 because '1' > '0'
   *     3.0.1 > 3.0.0 because '1' > '0'
   *     3.0.0 >= 3.0.0 because equal
   *
   * @param {string} version1 - The first version string to compare.
   * @param {string} version2 - The second version string to compare.
   * @returns {*} {boolean} - Indicates if version1 is greater than or equal to version2.
   */
  private isVersionGreaterThan(version1: string, version2: string): boolean {
    const maxLength = Math.max(version1.length, version2.length)

    for (let i = 0; i < maxLength; i++) {
      const charCode1 = version1.charCodeAt(i) || 0
      const charCode2 = version2.charCodeAt(i) || 0

      if (charCode1 > charCode2) {
        return true
      }

      if (charCode1 < charCode2) {
        return false
      }
    }
    return true
  }

  /**
   * Runs the app version check to verify the app does not need an update.
   *
   * @returns {*} {boolean} - A boolean indicating if the app should be updated.
   */
  runCheck() {
    const maxKnownVersion = this.serverStatus.supportedVersions.pop()

    if (!maxKnownVersion) {
      return true
    }

    // If app version is greater than or equal to the max known version, no update needed
    // ie: 3.15.1 >= 3.14.0  =>  true (no update needed)
    return this.isVersionGreaterThan(this.appVersion, maxKnownVersion)
  }

  /**
   * Handles the failure of the server status check by dispatching an error banner message.
   *
   * @returns {*} {void}
   */
  onFail() {
    const updateAvailable = this.isVersionGreaterThan(this.appVersion, this.serverStatus.minVersion)

    if (updateAvailable) {
      // Optional update available
      return this.utils.dispatch({
        type: BCDispatchAction.ADD_BANNER_MESSAGE,
        payload: [
          {
            id: BCSCBanner.APP_UPDATE_AVAILABLE,
            title: 'TODO: optional update available banner title',
            type: 'info',
            variant: 'warning',
            dismissible: true,
          },
        ],
      })
    }
  }

  /**
   * Handles the success of the server status check by removing the error banner message if it exists.
   *
   * @returns {*} {void}
   */
  onSuccess() {
    this.utils.dispatch({ type: BCDispatchAction.REMOVE_BANNER_MESSAGE, payload: [BCSCBanner.APP_UPDATE_AVAILABLE] })
  }
}
