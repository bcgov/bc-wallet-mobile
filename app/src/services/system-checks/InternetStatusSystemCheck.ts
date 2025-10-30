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
 * If the device is not connected to the internet, navigates to the InternetDisconnected modal.
 * If the device regains connectivity, navigates back to the previous screen.
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

  runCheck() {
    return Boolean(this.netInfo.isConnected && this.netInfo.isInternetReachable)
  }

  onFail() {
    this.logger.warn('InternetStatusSystemCheck: No internet connection detected')
    this.navigation.navigate(BCSCModals.InternetDisconnected)
  }

  onSuccess() {
    const routeIndex = this.navigation.getState().index
    const currentRoute = this.navigation.getState().routes[routeIndex]

    if (currentRoute.name !== BCSCModals.InternetDisconnected || !this.navigation.canGoBack()) {
      return
    }

    this.navigation.goBack()
  }
}
