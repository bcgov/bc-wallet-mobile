import QRScanner from '@/bcsc-theme/features/qr-core/QRScanner'
import { BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import useTransferQRScannerViewModel from './useTransferQRScannerViewModel'

type TransferQRScannerScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams>
}

const TransferQRScannerScreen: React.FC<TransferQRScannerScreenProps> = ({ navigation }) => {
  const { isLoading, scanError, handleScan, dismissError } = useTransferQRScannerViewModel(navigation)

  return <QRScanner isProcessing={isLoading} scanError={scanError} onScan={handleScan} onDismissError={dismissError} />
}

export default TransferQRScannerScreen
