import { BCSCModals } from '@/bcsc-theme/types/navigators'
import { BCSCEvent, BCSCReason, IdToken } from '@/bcsc-theme/utils/id-token'
import { SystemCheckNavigation, SystemCheckStrategy, SystemCheckUtils } from './system-checks'

/**
 * Checks if the device has been invalidated.
 *
 * Note: Determines the invalidation reason based on the values in the ID token.
 *   On failure, it navigates to the DeviceInvalidated modal.
 *   On success, it navigates back if currently on the DeviceInvalidated modal.
 *
 * @export
 * @class DeviceInvalidatedSystemCheck
 * @implements {SystemCheckStrategy}
 */
export class DeviceInvalidatedSystemCheck implements SystemCheckStrategy {
  private readonly getIdToken: () => Promise<IdToken>
  private readonly navigation: SystemCheckNavigation
  private readonly utils: SystemCheckUtils

  constructor(getIdToken: () => Promise<IdToken>, navigation: SystemCheckNavigation, utils: SystemCheckUtils) {
    this.getIdToken = getIdToken
    this.navigation = navigation
    this.utils = utils
  }

  private get isModalVisible() {
    const state = this.navigation.getState()
    const currentRouteName = state?.routes[state.index].name
    return currentRouteName === BCSCModals.DeviceInvalidated
  }

  /**
   * Runs the device invalidated check to verify if the device has been invalidated.
   *
   * @return {*}  {Promise<boolean>}
   * @memberof DeviceInvalidatedSystemCheck
   */
  async runCheck(): Promise<boolean> {
    try {
      const idToken = await this.getIdToken()

      if (idToken.bcsc_event === BCSCEvent.Cancel && idToken.bcsc_reason === BCSCReason.CanceledByAgent) {
        // Device has been invalidated by the agent, user must re-authorize the device
        return false
      }

      return true
    } catch (error) {
      this.utils.logger.error('DeviceInvalidatedSystemCheck: Id token request failed', error as Error)
      return false
    }
  }

  /**
   * Handles the failure of the device invalidated check
   * by navigating to the DeviceInvalidated modal.
   *
   * @returns {*} {void}
   * @memberof DeviceInvalidatedSystemCheck
   */
  onFail() {
    this.utils.logger.warn('DeviceInvalidatedSystemCheck: Device invalidated')

    // Only navigate if the modal is not already visible
    if (this.isModalVisible) {
      return
    }

    this.navigation.navigate(BCSCModals.DeviceInvalidated)
  }

  /**
   * Handles the success of the device invalidated check
   * by navigating back if currently on the DeviceInvalidated modal.
   *
   * @returns {*} {void}
   * @memberof DeviceInvalidatedSystemCheck
   */
  onSuccess() {
    // Only navigate back if the modal is visible
    if (!this.isModalVisible || !this.navigation.canGoBack()) {
      return
    }

    this.navigation.goBack()
  }
}
