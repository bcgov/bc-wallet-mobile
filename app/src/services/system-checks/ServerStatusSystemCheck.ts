import { ServerStatusResponseData } from '@/bcsc-theme/api/hooks/useConfigApi'
import { BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import { BCDispatchAction } from '@/store'
import { SystemCheckStrategy, SystemCheckUtils } from './system-checks'

/**
 * Checks the IAS server status and dispatches banner messages based on availability.
 * Will show error banner if server is unavailable, or info banner if there is a status message.
 *
 * Note:
 *   On failure, it dispatches a warning banner message.
 *   On success, it removes the banner if it exists.
 *
 * @class ServerStatusStartupCheck
 * @implements {SystemCheckStrategy}
 */
export class ServerStatusSystemCheck implements SystemCheckStrategy {
  private readonly serverStatus: ServerStatusResponseData
  private readonly utils: SystemCheckUtils

  constructor(serverStatus: ServerStatusResponseData, utils: SystemCheckUtils) {
    this.serverStatus = serverStatus
    this.utils = utils
  }

  /**
   * Runs the server status check to verify if the IAS server is available.
   *
   * @returns {*} {boolean} - True if the server status is 'ok', false otherwise.
   */
  runCheck() {
    return this.serverStatus.status === 'ok'
  }

  /**
   * Handles the failure of the server status check by dispatching an error banner message.
   *
   * @returns {*} {void}
   */
  onFail() {
    this.utils.dispatch({
      type: BCDispatchAction.ADD_BANNER_MESSAGE,
      payload: [
        {
          id: BCSCBanner.IAS_SERVER_UNAVAILABLE,
          title:
            this.serverStatus?.statusMessage ??
            this.utils.translation('BCSC.SystemChecks.ServerStatus.UnavailableBannerTitle'),
          type: 'error',
          variant: 'summary',
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
    this.utils.dispatch({ type: BCDispatchAction.REMOVE_BANNER_MESSAGE, payload: [BCSCBanner.IAS_SERVER_NOTIFICATION] })
    this.utils.dispatch({ type: BCDispatchAction.REMOVE_BANNER_MESSAGE, payload: [BCSCBanner.IAS_SERVER_UNAVAILABLE] })

    if (!this.serverStatus?.statusMessage) {
      return
    }

    // If the server has a status message, show it as an info banner
    this.utils.dispatch({
      type: BCDispatchAction.ADD_BANNER_MESSAGE,
      payload: [
        {
          id: BCSCBanner.IAS_SERVER_NOTIFICATION,
          title: this.serverStatus.statusMessage,
          type: 'info',
          variant: 'summary',
          dismissible: true,
        },
      ],
    })
  }
}
