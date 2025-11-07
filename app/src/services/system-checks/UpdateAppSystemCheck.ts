import { ServerStatusResponseData } from '@/bcsc-theme/api/hooks/useConfigApi'
import { BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import { BCSCModals, ModalNavigation } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction } from '@/store'
import { getVersion } from 'react-native-device-info'
import { SystemCheckStrategy, SystemCheckUtils } from './system-checks'

/**
 * Checks if the application needs to be updated.
 *
 * Rules for determining update status (in logical order):
 *
 *   No update:
 *    A. App version greater than or equal to max version
 *         ie: app: 3.0.0, max: 3.0.0 => no update (equal)
 *         ie: app: 3.0.0, max: 2.9.9 => no update (greater than)
 *
 *   Mandatory update:
 *    A. Supported versions does not include app version
 *        ie: app: 2.0.0, supported: [3.0.0, 3.1.0] => mandatory update (too old)
 *        ie: app: 3.0.1, supported: [3.0.0, 3.1.0] => mandatory update (unrecognized)
 *
 *   Optional update:
 *    A. App version greater than or equal to min version
 *        ie: app: 2.9.9, min: 2.0.0 => optional update (greater than)
 *        ie: app: 2.0.0, min: 2.0.0 => optional update (equal)
 *
 * @see {MandatoryUpdate.tsx} for the modal displayed during a mandatory update.
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
   * Note: This only works for semantic versioning where versions are in the format X.Y.Z.
   * If versions deviate from this format, the comparison may not work as expected.
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
    return version1.localeCompare(version2, undefined, { numeric: true, sensitivity: 'base' }) >= 0
  }

  /**
   * Runs the app version check to verify the app does not need an update.
   *
   * @returns {*} {boolean} - A boolean indicating if the app should be updated.
   */
  async runCheck() {
    const maxVersion = this.serverStatus.supportedVersions.at(-1)

    this.utils.logger.info('UpdateAppSystemCheck', {
      minVersion: this.serverStatus.minVersionNumber,
      maxVersion: maxVersion,
      appVersion: this.appVersion,
      supportedVersions: this.serverStatus.supportedVersions.join(', '),
    })

    if (!maxVersion) {
      // No max version provided => no update
      return true
    }

    // App version is greater than or equal max supported version => no update
    return this.isVersionGreaterOrEqualThan(this.appVersion, maxVersion)
  }

  /**
   * Handles the failure of the server status check by dispatching an error banner message.
   *
   * @returns {*} {void}
   */
  onFail() {
    const appVersionSupported = this.serverStatus.supportedVersions.includes(this.appVersion)

    // App version not supported => force mandatory update
    if (!appVersionSupported) {
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
