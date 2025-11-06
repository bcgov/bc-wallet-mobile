import { ServerStatusResponseData } from '@/bcsc-theme/api/hooks/useConfigApi'
import { BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import { BCSCModals, ModalNavigation } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction } from '@/store'
import { getVersion } from 'react-native-device-info'
import { SystemCheckStrategy, SystemCheckUtils } from './system-checks'

/**
 * Checks if the application needs to be updated.
 *
 * Optional update:
 *  A.1. Greater than or equal to minVersion
 *  A.2. Less than latestVersion
 *
 * Mandatory update:
 *  A. Less than minVersion
 *
 * Do nothing:
 *  A. Greater than or equal to latestVersion
 *
 * @class UpdateAppSystemCheck
 * @implements {SystemCheckStrategy}
 */
export class UpdateAppSystemCheck implements SystemCheckStrategy {
  private readonly serverStatus: ServerStatusResponseData
  private readonly appVersion: string
  private readonly navigation: ModalNavigation
  private readonly utils: SystemCheckUtils

  constructor(serverStatus: ServerStatusResponseData, navigation: ModalNavigation, utils: SystemCheckUtils) {
    this.serverStatus = serverStatus
    this.appVersion = getVersion()
    this.navigation = navigation
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
  isVersionGreaterOrEqualThan(version1: string, version2: string): boolean {
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
  async runCheck() {
    const maxVersion = this.serverStatus.supportedVersions.pop()

    if (!maxVersion) {
      this.utils.logger.warn('UpdateAppSystemCheck: No supported versions found in server status.')
      return false
    }

    return this.isVersionGreaterOrEqualThan(this.appVersion, maxVersion)
  }

  /**
   * Handles the failure of the server status check by dispatching an error banner message.
   *
   * @returns {*} {void}
   */
  onFail() {
    const updateRequired = this.isVersionGreaterOrEqualThan(this.appVersion, this.serverStatus.minVersion) === false

    if (updateRequired) {
      this.navigation.navigate(BCSCModals.MandatoryUpdate)
      return
    }

    // Optional update available
    return this.utils.dispatch({
      type: BCDispatchAction.ADD_BANNER_MESSAGE,
      payload: [
        {
          id: BCSCBanner.APP_UPDATE_AVAILABLE,
          title: this.utils.translation('Unified.SystemChecks.UpdateApp.UpdateAvailableBannerTitle'),
          type: 'info',
          variant: 'warning',
          dismissible: true,
        },
      ],
    })
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
