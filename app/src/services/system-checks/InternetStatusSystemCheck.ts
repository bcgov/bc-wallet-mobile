import { NetInfoState } from '@react-native-community/netinfo'
import { SystemCheckStrategy } from './system-checks'
import { BifoldLogger } from '@bifold/core'
import { Alert } from 'react-native'

export class InternetStatusSystemCheck implements SystemCheckStrategy {
  private netInfo: NetInfoState
  private readonly showModal: (show: boolean) => void
  private readonly logger: BifoldLogger

  constructor(netInfo: NetInfoState, showModal: (show: boolean) => void, logger: BifoldLogger) {
    this.netInfo = netInfo
    this.showModal = showModal
    this.logger = logger
  }

  runCheck() {
    return Boolean(this.netInfo.isConnected && this.netInfo.isInternetReachable)
  }

  onFail() {
    this.logger.warn('InternetStatusSystemCheck: No internet connection detected')
    this.showModal(true)
  }

  onSuccess() {
    console.log('InternetStatusSystemCheck: Internet connection is available') // TODO (MD): remove
    this.showModal(false)
    Alert.alert('Internet Connection Restored', 'Test message')
  }
}
