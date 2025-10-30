import { NetInfoState } from '@react-native-community/netinfo'
import { SystemCheckStrategy } from './system-checks'
import { BifoldLogger } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { BCSCModals, BCSCRootStackParams } from '@/bcsc-theme/types/navigators'

type InternetNavigation = StackNavigationProp<BCSCRootStackParams, BCSCModals.InternetDisconnected>

export class InternetStatusSystemCheck implements SystemCheckStrategy {
  private netInfo: NetInfoState
  private readonly navigation: InternetNavigation
  private readonly logger: BifoldLogger

  constructor(netInfo: NetInfoState, navigation: InternetNavigation, logger: BifoldLogger) {
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
    console.log('InternetStatusSystemCheck: Internet connection is available') // TODO (MD): remove
    this.navigation.goBack()
  }
}
