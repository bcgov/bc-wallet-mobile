import { NetInfoState } from '@react-native-community/netinfo'
import { SystemCheckStrategy } from './system-checks'
import { BifoldLogger } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { BCSCModals, BCSCRootStackParams, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'

export type InternetStatusStackNavigation = StackNavigationProp<
  BCSCRootStackParams | BCSCVerifyIdentityStackParams,
  BCSCModals.InternetDisconnected
>

/**
 * System check strategy to verify internet connectivity.
 *
 *
 * If the device is not connected to the internet, navigates to the InternetDisconnected modal.
 * If the device regains connectivity, navigates back to the previous screen.
 *
 * @see {InternetDisonnected.tsx} for the modal displayed when disconnected.
 *
 * @class InternetStatusSystemCheck
 * @implements {SystemCheckStrategy}
 */
export class InternetStatusSystemCheck implements SystemCheckStrategy {
  private netInfo: NetInfoState
  private readonly navigation: InternetStatusStackNavigation
  private readonly logger: BifoldLogger

  constructor(netInfo: NetInfoState, navigation: InternetStatusStackNavigation, logger: BifoldLogger) {
    this.netInfo = netInfo
    this.navigation = navigation
    this.logger = logger
  }

  /**
   * Checks if the InternetDisconnected modal is currently visible.
   *
   * @returns {*} {boolean} True if the modal is visible, false otherwise.
   */
  private get isModalVisible() {
    const state = this.navigation.getState()
    const currentRouteName = state.routes[state.index].name
    return currentRouteName === BCSCModals.InternetDisconnected
  }

  /**
   * Runs the internet connectivity check.
   *
   * @returns {boolean} True if the device is connected to the internet, false otherwise.
   */
  runCheck() {
    return Boolean(this.netInfo.isConnected && this.netInfo.isInternetReachable)
  }

  /**
   * Handles the failure of the internet connectivity check
   * by navigating to the InternetDisconnected modal.
   *
   * @returns {*} {void}
   */
  onFail() {
    this.logger.warn('InternetStatusSystemCheck: No internet connection detected')

    // Only navigate if the modal is not already visible
    if (this.isModalVisible) {
      return
    }

    this.navigation.navigate(BCSCModals.InternetDisconnected)
  }

  /**
   * Handles the success of the internet connectivity check
   * by navigating back if currently on the InternetDisconnected modal.
   *
   * @returns {*} {void}
   */
  onSuccess() {
    // Only navigate back if the modal is visible
    if (!this.isModalVisible || !this.navigation.canGoBack()) {
      return
    }

    this.navigation.goBack()
  }
}
