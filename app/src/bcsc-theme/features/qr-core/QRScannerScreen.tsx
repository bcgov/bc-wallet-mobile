import { BCSCMainStackParams, BCSCQRCoreScreens, BCSCQRCoreTabParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useMemo } from 'react'
import { useAccountTransferQRCodeStrategy } from './qr-code-strategies/useAccountTransferQRCodeStrategy'
import { usePairingCodeQRCodeStrategy } from './qr-code-strategies/usePairingCodeQRCodeStrategy'
import QRScanner from './QRScanner'
import { useQRScanner } from './useQRScanner'

const QRScannerScreen: React.FC = () => {
  const navigation = useNavigation<BottomTabNavigationProp<BCSCQRCoreTabParams>>()

  const verificationSuccess = useCallback(() => {
    navigation.getParent<StackNavigationProp<BCSCMainStackParams>>()?.navigate(BCSCScreens.VerificationSuccess)
  }, [navigation])

  const pairingCodeFound = useCallback(
    (pairingCode: string) => {
      navigation.navigate(BCSCQRCoreScreens.PairingCode, { pairingCode })
    },
    [navigation]
  )

  const pairingCodeQRCodeStrategy = usePairingCodeQRCodeStrategy(pairingCodeFound)
  const accountTransferQRCodeStrategy = useAccountTransferQRCodeStrategy(verificationSuccess)

  const strategies = useMemo(
    () => [pairingCodeQRCodeStrategy, accountTransferQRCodeStrategy],
    [accountTransferQRCodeStrategy, pairingCodeQRCodeStrategy]
  )

  const { isProcessing, scanError, handleScan, dismissError } = useQRScanner(strategies)

  // const onConnectionFound = useCallback(
  //   (oobRecordId: string) => {
  //     // QRScannerScreen sits inside QRCoreStack (a tab navigator); ConnectionLoading
  //     // lives on MainStack, so escape up via getParent before navigating.
  //     navigation
  //       .getParent<StackNavigationProp<BCSCMainStackParams>>()
  //       ?.navigate(BCSCScreens.ConnectionLoading, { oobRecordId })
  //   },
  //   [navigation]
  // )

  // const { isProcessing, scanError, handleScan, dismissError, resetNavigationLock } = useScanScreenViewModel({
  //   onConnectionFound,
  //   onPairingCodeFound,
  // })

  // QRCoreStack has `unmountOnBlur: false` so the scanner persists across the
  // ConnectionLoading round trip; reset the nav lock on each focus so the
  // user can scan again after completing a flow.
  // useFocusEffect(
  //   useCallback(() => {
  //     resetNavigationLock()
  //   }, [resetNavigationLock])
  // )

  return (
    <QRScanner isProcessing={isProcessing} scanError={scanError} onScan={handleScan} onDismissError={dismissError} />
  )
}

export default QRScannerScreen
