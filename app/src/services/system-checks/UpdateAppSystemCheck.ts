import { BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import { BCSCModals, ModalNavigation } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction } from '@/store'
import { checkVersion, CheckVersionResponse } from 'react-native-check-version'
import { getVersion } from 'react-native-device-info'
import { SystemCheckStrategy, SystemCheckUtils } from './system-checks'

/**
 * Checks if the application needs to be updated.
 *
 * @class UpdateAppSystemCheck
 * @implements {SystemCheckStrategy}
 */
export class UpdateAppSystemCheck implements SystemCheckStrategy {
  private readonly bundleId: string
  private readonly navigation: ModalNavigation
  private readonly utils: SystemCheckUtils
  private versionInfoCache: CheckVersionResponse | null

  constructor(bundleId: string, navigation: ModalNavigation, utils: SystemCheckUtils) {
    this.bundleId = bundleId
    this.navigation = navigation
    this.utils = utils
    this.versionInfoCache = null
  }

  /**
   * Runs the app version check to verify the app does not need an update.
   *
   * @returns {*} {boolean} - A boolean indicating if the app should be updated.
   */
  async runCheck() {
    // Cache the version info for use in onFail/onSuccess
    this.versionInfoCache = await checkVersion({
      bundleId: this.bundleId,
      currentVersion: getVersion(),
    })

    // TODO: check for network error

    return this.versionInfoCache.needsUpdate === false
  }

  /**
   * Handles the failure of the server status check by dispatching an error banner message.
   *
   * @returns {*} {void}
   */
  onFail() {
    if (!this.versionInfoCache) {
      throw new Error('UpdateAppSystemCheck: Version info cache empty.')
    }

    const updateRequired = this.versionInfoCache.updateType === 'major'

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
