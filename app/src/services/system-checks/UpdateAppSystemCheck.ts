import { ServerStatusResponseData } from '@/bcsc-theme/api/hooks/useConfigApi'
import { AppUpdate } from '@/bcsc-theme/state/banners/app-update'
import { selectAppUpdate } from '@/bcsc-theme/state/banners/selectors'
import { BCSCModals } from '@/bcsc-theme/types/navigators'
import { getBuildNumber, getVersion } from 'react-native-device-info'
import { SystemCheckNavigation, SystemCheckStrategy, SystemCheckUtils } from './system-checks'

/**
 * Checks if the application needs to be updated.
 *
 * `serverStatus.minVersion` is a build number. `serverStatus.supportedVersions` lists only the versions marked GA
 * in the support tools for the current platform.
 *
 * Rules for determining update status (in logical order):
 *
 *   Mandatory update:
 *    A. App build is less than min build. The supported versions play no part.
 *      ie: app: [3.0.1-99], minBuild: [100] => **mandatory update**
 *
 *   Optional update:
 *    A. App build is not below min build and a supported version is newer than the app version
 *      ie: app: [3.0.0-101], minBuild: [100], supported: [3.0.0, 3.1.0] => **optional update** (banner)
 *
 *   No update:
 *    A. App build is not below min build and no supported version is newer than the app version
 *      ie: app: [3.1.0-101], minBuild: [100], supported: [3.0.0, 3.1.0] => **no update**
 *
 * To force an upgrade, raise the min build.
 *
 * @see {MandatoryUpdate.tsx} for the modal displayed during a mandatory update.
 *
 * @class UpdateAppSystemCheck
 * @implements {SystemCheckStrategy}
 */
export class UpdateAppSystemCheck implements SystemCheckStrategy {
  private readonly serverStatus: ServerStatusResponseData
  private readonly appVersion: string
  private readonly appBuild: number
  private readonly navigation: SystemCheckNavigation
  private readonly utils: SystemCheckUtils

  constructor(serverStatus: ServerStatusResponseData, navigation: SystemCheckNavigation, utils: SystemCheckUtils) {
    this.serverStatus = serverStatus
    this.appVersion = getVersion()
    this.appBuild = Number(getBuildNumber())
    this.navigation = navigation
    this.utils = utils
  }

  /**
   * Runs the app build check against the server's minimum build.
   *
   * @returns {*} {boolean} - False when the app build is below the minimum build (mandatory update).
   */
  runCheck() {
    this.utils.logger.info('[UpdateAppSystemCheck] server status', {
      appVersion: this.appVersion,
      appBuild: this.appBuild,
      // Server field names, verbatim: `minVersion` is the build-number floor, `minVersionNumber` is semver
      minVersion: this.serverStatus.minVersion,
      minVersionNumber: this.serverStatus.minVersionNumber,
      supportedVersions: this.serverStatus.supportedVersions,
    })

    return selectAppUpdate(this.serverStatus) !== AppUpdate.Mandatory
  }

  /**
   * Handles a build below the minimum build by navigating to the blocking update modal.
   *
   * @returns {*} {void}
   */
  onFail() {
    this.utils.logger.info('[UpdateAppSystemCheck] result: mandatory update', {
      appBuild: this.appBuild,
      minVersion: this.serverStatus.minVersion,
    })
    this.navigation.navigate(BCSCModals.MandatoryUpdate)
  }
}
