import QRScanner from '@/bcsc-theme/features/qr-core/QRScanner'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { useAlerts } from '@/hooks/useAlerts'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { default as React, useCallback, useMemo } from 'react'
import { useAccountTransferQRCodeStrategy } from '../../qr-core/qr-code-strategies/useAccountTransferQRCodeStrategy'
import { usePairingCodeQRCodeStrategy } from '../../qr-core/qr-code-strategies/usePairingCodeQRCodeStrategy'
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
const TransferQRScannerScreen = ({ navigation }: TransferQRScannerScreenProps) => {
  const { pairingCodeScannedDuringTransferAlert } = useAlerts()

  const verificationSuccess = useCallback(() => {
    navigation.navigate(BCSCScreens.VerificationSuccess)
  }, [navigation])

  const onPairingCodeScanned = useCallback(() => {
    pairingCodeScannedDuringTransferAlert()
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: BCSCScreens.AccountSetup }] }))
  }, [navigation, pairingCodeScannedDuringTransferAlert])

  const pairingCodeStrategy = usePairingCodeQRCodeStrategy(onPairingCodeScanned)
  const accountTransferQRCodeStrategy = useAccountTransferQRCodeStrategy(verificationSuccess)

  const strategies = useMemo(
    () => [accountTransferQRCodeStrategy, pairingCodeStrategy],
    [accountTransferQRCodeStrategy, pairingCodeStrategy]
  )

  const { isProcessing, handleScan } = useQRScanner(strategies)

  return <QRScanner isProcessing={isProcessing} onScan={handleScan} />
}

export default TransferQRScannerScreen
