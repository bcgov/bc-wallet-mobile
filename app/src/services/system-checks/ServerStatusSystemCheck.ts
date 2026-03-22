import { ServerStatusResponseData } from '@/bcsc-theme/api/hooks/useConfigApi'
import { BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import { BCSCModals } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction } from '@/store'
import { SystemCheckNavigation, SystemCheckStrategy, SystemCheckUtils } from './system-checks'

/**
 * Checks the IAS server status and dispatches banner messages based on availability.
 *
 * Note:
 *   On failure, it navigates to the ServiceOutage modal and dispatches an info banner.
 *   On success, it dismisses the modal (if visible) and removes the banner if it exists.
 *
 * @class ServerStatusSystemCheck
 * @implements {SystemCheckStrategy}
 */
export class ServerStatusSystemCheck implements SystemCheckStrategy {
  private readonly serverStatus: ServerStatusResponseData
  private readonly utils: SystemCheckUtils
  private readonly navigation: SystemCheckNavigation

  constructor(serverStatus: ServerStatusResponseData, utils: SystemCheckUtils, navigation: SystemCheckNavigation) {
    this.serverStatus = serverStatus
    this.utils = utils
    this.navigation = navigation
  }

  private get isModalVisible() {
    const state = this.navigation.getState()
    const currentRouteName = state?.routes[state.index].name
    return currentRouteName === BCSCModals.ServiceOutage
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
   * Handles the failure of the server status check by navigating to the ServiceOutage modal
   * and dispatching an info banner message.
   *
   * @returns {*} {void}
   */
  onFail() {
    if (!this.isModalVisible) {
      this.navigation.navigate(BCSCModals.ServiceOutage, {
        statusMessage: this.serverStatus.statusMessage,
        contactLink: this.serverStatus.contactLink,
      })
    }

    this.utils.dispatch({
      type: BCDispatchAction.ADD_BANNER_MESSAGE,
      payload: [
        {
          id: BCSCBanner.IAS_SERVER_UNAVAILABLE,
          title: undefined,
          description:
            this.serverStatus.statusMessage ??
            this.utils.translation('BCSC.SystemChecks.ServerStatus.UnavailableBannerTitle'),
          type: 'info',
          dismissible: false,
          metadata: {
            contactLink: this.serverStatus.contactLink,
          },
        },
      ],
    })
  }

  /**
   * Handles the success of the server status check by dismissing the ServiceOutage modal
   * (if visible) and removing the info banner message if it exists.
   *
   * @returns {*} {void}
   */
  onSuccess() {
    if (this.isModalVisible && this.navigation.canGoBack()) {
      this.navigation.goBack()
    }

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
          title: undefined,
          description: this.serverStatus.statusMessage,
          type: 'info',
          dismissible: false,
          metadata: {
            contactLink: this.serverStatus.contactLink,
          },
        },
      ],
    })
  }
}
