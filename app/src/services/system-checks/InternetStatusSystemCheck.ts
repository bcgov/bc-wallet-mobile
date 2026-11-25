import { BCSCModals } from '@/bcsc-theme/types/navigators'
import { BifoldLogger } from '@bifold/core'
import { NavigationState } from '@react-navigation/native'
import { SystemCheckNavigation, SystemCheckStrategy } from './system-checks'

/**
 * The navigators on the focused path, outermost first. `getState()` is the root navigator's state,
 * and the modal is registered in the phase stack nested under it.
 *
 * @param {NavigationState | undefined} state The root navigation state.
 * @returns {*} {NavigationState[]} The focused navigator states, root first.
 */
const getFocusedPath = (state: NavigationState | undefined): NavigationState[] => {
  const path: NavigationState[] = []

  for (let current: NavigationState | undefined = state; current; ) {
    path.push(current)
    current = current.routes[current.index ?? 0]?.state as NavigationState | undefined
  }

  return path
}

/**
 * System check strategy to verify internet connectivity.
 *
 * If the device is not connected to the internet, navigates to the InternetDisconnected modal.
 * If the device regains connectivity, navigates back to the previous screen.
 *
 * @see {InternetDisonnected.tsx} for the modal displayed when disconnected.
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

  // Visible when it is the focused route of the innermost navigator on the focused path
  private isModalVisible(state: NavigationState | undefined) {
    const path = getFocusedPath(state)
    const leaf = path.at(-1)

    return leaf?.routes[leaf.index ?? 0]?.name === BCSCModals.InternetDisconnected
  }

  /**
   * Whether a navigator on the focused path registers the InternetDisconnected modal.
   *
   * False while the root navigator shows its startup Loading route, which registers no modals:
   * navigating then would log "NAVIGATE ... was not handled by any navigator".
   */
  private canShowModal(state: NavigationState | undefined) {
    return getFocusedPath(state).some((navigator) => navigator.routeNames?.includes(BCSCModals.InternetDisconnected))
  }

  runCheck() {
    return Boolean(this.isConnected && (this.isInternetReachable === true || this.isInternetReachable === null))
  }

  /**
   * Handles the failure of the internet connectivity check
   * by navigating to the InternetDisconnected modal.
   */
  onFail() {
    this.logger.warn('InternetStatusSystemCheck: No internet connection detected')

    // Read the navigation state once so both guards and the navigate observe the same snapshot
    const state = this.navigation.getState()

    // Only navigate if the modal is not already visible
    if (this.isModalVisible(state)) {
      return
    }

    if (!this.canShowModal(state)) {
      // Still on the startup Loading route; skip to avoid an unhandled NAVIGATE. The next NetInfo
      // change or app-foreground event re-runs the check.
      return
    }

    this.navigation.navigate(BCSCModals.InternetDisconnected)
  }

  /**
   * Handles the success of the internet connectivity check
   * by navigating back if currently on the InternetDisconnected modal.
   */
  onSuccess() {
    if (!this.isModalVisible(this.navigation.getState()) || !this.navigation.canGoBack()) {
      return
    }

    this.navigation.goBack()
  }
}
