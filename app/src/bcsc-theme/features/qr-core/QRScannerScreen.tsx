import { BCSCMainStackParams, BCSCQRCoreScreens, BCSCQRCoreTabParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useMemo } from 'react'
import { useAccountTransferQRCodeStrategy } from './qr-code-strategies/useAccountTransferQRCodeStrategy'
import { useDidCommOobQRCodeStrategy } from './qr-code-strategies/useDidCommOobQRCodeStrategy'
import { usePairingCodeQRCodeStrategy } from './qr-code-strategies/usePairingCodeQRCodeStrategy'
import QRScanner from './QRScanner'
import { useQRScanner } from './useQRScanner'

const QRScannerScreen: React.FC = () => {
  const navigation = useNavigation<BottomTabNavigationProp<BCSCQRCoreTabParams>>()

  const pairingCodeFound = useCallback(
    (pairingCode: string) => {
      navigation.navigate(BCSCQRCoreScreens.PairingCode, { pairingCode })
    },
    [navigation]
  )

  const verificationSuccess = useCallback(() => {
    navigation.getParent<StackNavigationProp<BCSCMainStackParams>>()?.navigate(BCSCScreens.VerificationSuccess)
  }, [navigation])

  const onConnectionFound = useCallback(
    (oobRecordId: string) => {
      navigation.getParent<StackNavigationProp<BCSCMainStackParams>>()?.navigate(BCSCScreens.ConnectionLoading, {
        oobRecordId,
      })
    },
    [navigation]
  )

  const pairingCodeQRCodeStrategy = usePairingCodeQRCodeStrategy(pairingCodeFound)
  const accountTransferQRCodeStrategy = useAccountTransferQRCodeStrategy(verificationSuccess)
  const didCommOobQRCodeStrategy = useDidCommOobQRCodeStrategy(onConnectionFound)

  const strategies = useMemo(
    () => [pairingCodeQRCodeStrategy, accountTransferQRCodeStrategy, didCommOobQRCodeStrategy],
    [accountTransferQRCodeStrategy, didCommOobQRCodeStrategy, pairingCodeQRCodeStrategy]
  )

  const { isProcessing, scanError, handleScan, dismissError } = useQRScanner(strategies)

  return (
    <QRScanner isProcessing={isProcessing} scanError={scanError} onScan={handleScan} onDismissError={dismissError} />
  )
}

export default QRScannerScreen
