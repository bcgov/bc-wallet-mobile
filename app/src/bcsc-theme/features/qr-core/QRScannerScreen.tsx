import { BCSCMainStackParams, BCSCQRCoreScreens, BCSCQRCoreTabParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useMemo } from 'react'
import { useAccountTransferQRCodeStrategy } from './qr-code-strategies/useAccountTransferQRCodeStrategy'
import { useDidCommOobQRCodeStrategy } from './qr-code-strategies/useDidCommOobQRCodeStrategy'
import { usePairingCodeQRCodeStrategy } from './qr-code-strategies/usePairingCodeQRCodeStrategy'
import QRScanner from './QRScanner'
import { useQRScanner } from './useQRScanner'

/**
 * QRScannerScreen is a React component that renders a QR scanner for various QR code strategies.
 *
 * Compatible QR codes:
 *  - Pairing code QR codes (e.g., for logging into a service)
 *  - Account transfer QR codes (e.g., for transferring an account)
 *  - DIDComm OOB QR codes (e.g., for establishing a VC connection)
 *
 * @returns A React element that renders the QR scanner for various QR code strategies.
 */
const QRScannerScreen: React.FC = () => {
  const navigation = useNavigation<BottomTabNavigationProp<BCSCQRCoreTabParams>>()

  const onPairingCodeFound = useCallback(
    (pairingCode: string) => {
      navigation.navigate(BCSCQRCoreScreens.PairingCode, { pairingCode })
    },
    [navigation]
  )

  const onAccountTransferSuccess = useCallback(() => {
    navigation.getParent<StackNavigationProp<BCSCMainStackParams>>()?.navigate(BCSCScreens.VerificationSuccess)
  }, [navigation])

  const onAlreadyVerified = useCallback(() => {
    navigation.getParent<StackNavigationProp<BCSCMainStackParams>>()?.navigate(BCSCScreens.AlreadyVerifiedSuccess)
  }, [navigation])

  const onConnectionFound = useCallback(
    (oobRecordId: string) => {
      navigation.getParent<StackNavigationProp<BCSCMainStackParams>>()?.navigate(BCSCScreens.ConnectionLoading, {
        oobRecordId,
      })
    },
    [navigation]
  )

  const pairingCodeQRCodeStrategy = usePairingCodeQRCodeStrategy(onPairingCodeFound)
  const accountTransferQRCodeStrategy = useAccountTransferQRCodeStrategy(onAccountTransferSuccess, onAlreadyVerified)
  const didCommOobQRCodeStrategy = useDidCommOobQRCodeStrategy(onConnectionFound)

  const strategies = useMemo(
    () => [pairingCodeQRCodeStrategy, accountTransferQRCodeStrategy, didCommOobQRCodeStrategy],
    [accountTransferQRCodeStrategy, didCommOobQRCodeStrategy, pairingCodeQRCodeStrategy]
  )

  const { isProcessing, scanError, handleScan, dismissError, resetLock } = useQRScanner(strategies)

  useFocusEffect(
    useCallback(() => {
      resetLock()
    }, [resetLock])
  )

  return (
    <QRScanner isProcessing={isProcessing} scanError={scanError} onScan={handleScan} onDismissError={dismissError} />
  )
}

export default QRScannerScreen
