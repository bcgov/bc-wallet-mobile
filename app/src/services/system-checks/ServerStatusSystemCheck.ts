import { ServerStatusResponseData } from '@/bcsc-theme/api/hooks/useConfigApi'
import { BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import { isNetworkError } from '@/bcsc-theme/utils/error-utils'
import { BCDispatchAction } from '@/store'
import { SystemCheckStrategy, SystemCheckUtils } from './system-checks'

/**
 * Checks the IAS server status and dispatches banner messages based on availability.
 * Will show error banner if server is unavailable, or info banner if there is a status message.
 *
 * Note: Determines server availability via the config API.
 *   On failure, it dispatches a warning banner message.
 *   On success, it removes the banner if it exists.
 *
 * @class ServerStatusStartupCheck
 * @implements {SystemCheckStrategy}
 */
export class ServerStatusSystemCheck implements SystemCheckStrategy {
  private readonly getServerStatus: () => Promise<ServerStatusResponseData>
  private readonly utils: SystemCheckUtils
  private serverStatus?: ServerStatusResponseData

  constructor(getServerStatus: () => Promise<ServerStatusResponseData>, utils: SystemCheckUtils) {
    this.getServerStatus = getServerStatus
    this.utils = utils
  }

  /**
   * Runs the server status check to verify if the IAS server is available.
   *
   * @returns {*} {Promise<boolean>} - A promise that resolves to true if the server is available, false otherwise.
   */
  async runCheck() {
    try {
      const serverStatus = await this.getServerStatus()

      // Store the server status for use in onFail/onSuccess
      this.serverStatus = serverStatus

      return serverStatus.status === 'ok'
    } catch (error) {
      this.utils.logger.error('ServerStatusSystemCheck: Server status request failed', error as Error)
      // Treat network errors as non-failures (handled by InternetStatusSystemCheck)
      return isNetworkError(error)
    }
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
            this.utils.translation('Unified.SystemChecks.ServerStatus.UnavailableBannerTitle'),
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
