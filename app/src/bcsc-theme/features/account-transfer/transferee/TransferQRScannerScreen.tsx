import QRScanner from '@/bcsc-theme/features/qr-core/QRScanner'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useMemo } from 'react'
import { useAccountTransferQRCodeStrategy } from '../../qr-core/qr-code-strategies/useAccountTransferQRCodeStrategy'
import { useQRScanner } from '../../qr-core/useQRScanner'

type TransferQRScannerScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams>
}

/**
 * TransferQRScannerScreen is a React component that renders a QR scanner for account transfer.
 * When a QR code is successfully scanned, it navigates to the VerificationSuccess screen.
 * @param props - The props for the TransferQRScannerScreen component.
 * @returns A React element that renders the QR scanner for account transfer.
 */
const TransferQRScannerScreen: React.FC<TransferQRScannerScreenProps> = ({ navigation }) => {
  const verificationSuccess = useCallback(() => {
    navigation.navigate(BCSCScreens.VerificationSuccess)
  }, [navigation])
  const accountTransferQRCodeStrategy = useAccountTransferQRCodeStrategy(verificationSuccess)
  const strategies = useMemo(() => [accountTransferQRCodeStrategy], [accountTransferQRCodeStrategy])
  const { isProcessing, scanError, handleScan, dismissError } = useQRScanner(strategies)

  return (
    <QRScanner isProcessing={isProcessing} scanError={scanError} onScan={handleScan} onDismissError={dismissError} />
  )
}

export default TransferQRScannerScreen
