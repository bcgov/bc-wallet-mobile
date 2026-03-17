import { ServerStatusResponseData } from '@/bcsc-theme/api/hooks/useConfigApi'
import { BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import { BCSCModals } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction } from '@/store'
import { getBuildNumber, getVersion } from 'react-native-device-info'
import { SystemCheckNavigation, SystemCheckStrategy, SystemCheckUtils } from './system-checks'

/**
 * Checks if the application needs to be updated.
 *
 * Rules for determining update status (in logical order):
 *
 *   No update:
 *    A. App build is greater than or equal to min build
 *      ie: app: [3.0.0-101], minBuild: [100] => **no update** (build greater than)
 *      ie: app: [3.0.0-101], minBuild: [101] => **no update** (build equal to)
 *
 *   Mandatory update:
 *    A. App build is less than min build and app version is *not* supported
 *      ie: app: [3.0.1-99], minBuild: [100], supported: [3.0.0] => **mandatory update** (version not supported)
 *
 *   Optional update:
 *    A. App build is less than min build and app version **is** supported
 *      ie: app: [3.0.0-99], minBuild: [100], supported: [3.0.0] => **optional update** (version supported)
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
   * Runs the app version check to verify the app does not need an update.
   *
   * @returns {*} {boolean} - A boolean indicating if the app should be updated.
   */
  runCheck() {
    this.utils.logger.info('UpdateAppSystemCheck', {
      minVersion: this.serverStatus.minVersionNumber,
      maxVersion: this.serverStatus.supportedVersions.at(-1),
      appVersion: this.appVersion,
      minBuild: this.serverStatus.minVersion,
      appBuild: this.appBuild,
      supportedVersions: this.serverStatus.supportedVersions,
    })

    return this.appBuild >= Number(this.serverStatus.minVersion)
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
      return this.navigation.navigate(BCSCModals.MandatoryUpdate)
    }

    // Optional update available
    return this.utils.dispatch({
      type: BCDispatchAction.ADD_BANNER_MESSAGE,
      payload: [
        {
          id: BCSCBanner.APP_UPDATE_AVAILABLE,
          title: this.utils.translation('BCSC.SystemChecks.UpdateApp.UpdateAvailableBannerTitle'),
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
