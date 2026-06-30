import { BCSCModals } from '@/bcsc-theme/types/navigators'
import { BifoldLogger } from '@bifold/core'
import { SystemCheckNavigation, SystemCheckStrategy } from './system-checks'

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
  private readonly isConnected: boolean | null
  private readonly isInternetReachable: boolean | null
  private readonly navigation: SystemCheckNavigation
  private readonly logger: BifoldLogger

  constructor(
    isConnected: boolean | null,
    isInternetReachable: boolean | null,
    navigation: SystemCheckNavigation,
    logger: BifoldLogger
  ) {
    this.isConnected = isConnected
    this.isInternetReachable = isInternetReachable
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
    const currentRouteName = state?.routes[state.index].name
    return currentRouteName === BCSCModals.InternetDisconnected
  }

  /**
   * Whether the InternetDisconnected modal can be navigated to from the currently-mounted navigator.
   *
   * Guards the root-stack swap window (e.g. onboarding → verify after biometric setup), where the
   * single child navigator is mid-remount and `getState()` is undefined, and the non-navigator
   * LoadingScreen branch. Navigating in those windows logs "NAVIGATE ... was not handled by any
   * navigator". Safe because this getter and `navigate` are read synchronously in `onFail` with no
   * await between them, so they observe the same container navigator.
   *
   * @returns {*} {boolean} True if the modal route is registered in the current navigator.
   */
  private get canShowModal() {
    return this.navigation.getState()?.routeNames?.includes(BCSCModals.InternetDisconnected) ?? false
  }

  /**
   * Runs the internet connectivity check.
   *
   * @returns {boolean} True if the device is connected to the internet and internet is reachable or unknown, false otherwise.
   */
  runCheck() {
    return Boolean(this.isConnected && (this.isInternetReachable === true || this.isInternetReachable === null))
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

    if (!this.canShowModal) {
      // Root stack is mid-swap / on the non-navigator LoadingScreen; skip to avoid an unhandled
      // NAVIGATE. The next NetInfo/foreground check re-runs once a stack is mounted.
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
