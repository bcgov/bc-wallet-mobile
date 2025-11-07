import { ServerStatusResponseData } from '@/bcsc-theme/api/hooks/useConfigApi'
import { BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import { BCSCModals, ModalNavigation } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction } from '@/store'
import { getBuildNumber, getVersion } from 'react-native-device-info'
import { SystemCheckStrategy, SystemCheckUtils } from './system-checks'

/**
 * Checks if the application needs to be updated.
 *
 * Rules for determining update status (in logical order):
 *
 *   No update:
 *    A. App build is greater than or equal to min build
 *        ie: app: [3.0.1] (build [102]), min: [3.0.0] (build [101]) => **no update** (greater than)
 *
 *   Mandatory update:
 *    A. App build is less than min build and app version is *not* supported
 *        ie: app: [3.2.0], supported: [3.0.0, 3.1.0] => **mandatory update** (too new)
 *
 *   Optional update:
 *    A. App build is less than min build and app version **is** supported
 *        ie: app: [2.9.9], min: [2.0.0] => **optional update** (greater than)
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
  private readonly navigation: ModalNavigation
  private readonly utils: SystemCheckUtils

  constructor(serverStatus: ServerStatusResponseData, navigation: ModalNavigation, utils: SystemCheckUtils) {
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
