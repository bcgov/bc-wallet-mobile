import QRScanner from '@/bcsc-theme/features/qr-core/QRScanner'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { StackNavigationProp } from '@react-navigation/stack'
import { default as React, useCallback, useMemo } from 'react'
import { useAccountTransferQRCodeStrategy } from '../../qr-core/qr-code-strategies/useAccountTransferQRCodeStrategy'
import { useQRScanner } from '../../qr-core/useQRScanner'

type TransferQRScannerScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams>
}

/**
 * When a QR code is successfully scanned, it navigates to the VerificationSuccess screen.
 */
const TransferQRScannerScreen = ({ navigation }: TransferQRScannerScreenProps) => {
  const verificationSuccess = useCallback(() => {
    navigation.navigate(BCSCScreens.VerificationSuccess)
  }, [navigation])

  const accountTransferQRCodeStrategy = useAccountTransferQRCodeStrategy(verificationSuccess)

  const strategies = useMemo(() => [accountTransferQRCodeStrategy], [accountTransferQRCodeStrategy])

  const { isProcessing, handleScan } = useQRScanner(strategies)

  return <QRScanner isProcessing={isProcessing} onScan={handleScan} />
}

export default TransferQRScannerScreen
