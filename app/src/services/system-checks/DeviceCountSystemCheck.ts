import { BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import { isNetworkError } from '@/bcsc-theme/utils/error-utils'
import { IdToken } from '@/bcsc-theme/utils/id-token'
import { BCDispatchAction } from '@/store'
import { SystemCheckStrategy, SystemCheckUtils } from './system-checks'

/**
 * Checks if the number of registered devices exceeds the allowed limit.
 *
 * Note: Determines the limit based on the values in the ID token.
 *   On failure, it dispatches a warning banner message.
 *   On success, it removes the banner if it exists.
 *
 * @class DeviceCountStartupCheck
 * @implements {SystemCheckStrategy}
 */
export class DeviceCountSystemCheck implements SystemCheckStrategy {
  private readonly getIdToken: () => Promise<IdToken>
  private readonly utils: SystemCheckUtils

  constructor(getIdToken: () => Promise<IdToken>, utils: SystemCheckUtils) {
    this.getIdToken = getIdToken
    this.utils = utils
  }

  /**
   * Runs the device count check to verify if the number of registered devices is within the allowed limit.
   *
   * @returns {Promise<boolean>} - A promise that resolves to true if the device count is within the limit, false otherwise.
   */
  async runCheck() {
    try {
      const idToken = await this.getIdToken()

      return idToken.bcsc_devices_count < idToken.bcsc_max_devices
    } catch (error) {
      this.utils.logger.error('DeviceSystemCheck: Id token request failed', error as Error)
      // Treat network errors as non-failures (handled by InternetStatusSystemCheck)
      return isNetworkError(error)
    }
  }

  /**
   * Handles the failure of the device count check by dispatching a warning banner message.
   *
   * @returns {*} {void}
   */
  onFail() {
    this.utils.dispatch({
      type: BCDispatchAction.ADD_BANNER_MESSAGE,
      payload: [
        {
          id: BCSCBanner.DEVICE_LIMIT_EXCEEDED,
          title: this.utils.translation('BCSC.SystemChecks.Devices.DeviceLimitReachedBannerTitle'),
          type: 'warning',
          variant: 'summary',
          dismissible: false, // Non-dismissible banner (user must dismiss from screen)
        },
      ],
    })
  }

  /**
   * Handles the success of the device count check by removing the warning banner message if it exists.
   *
   * @returns {*} {void}
   */
  onSuccess() {
    this.utils.dispatch({ type: BCDispatchAction.REMOVE_BANNER_MESSAGE, payload: [BCSCBanner.DEVICE_LIMIT_EXCEEDED] })
  }
}
