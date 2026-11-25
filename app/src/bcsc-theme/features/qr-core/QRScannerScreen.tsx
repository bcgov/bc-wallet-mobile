import { useCardStatus } from '@/bcsc-theme/hooks/useCardStatus'
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
 *  - Mediator invitation QR codes (developer mode only; opens the mediator picker)
 *
 * @returns A React element that renders the QR scanner for various QR code strategies.
 */
const QRScannerScreen: React.FC = () => {
  const { isExpired, isVerified } = useCardStatus()
  const navigation = useNavigation<BottomTabNavigationProp<BCSCQRCoreTabParams>>()

  /**
   * Callback function that handles the scanned pairing code.
   *
   * Possible scenarios:
   *  1. If the card is expired => user must re-verify
   *  2. If the card is not verified => user must verify the card first
   *  3. If the card is verified => handle the pairing code login
   *
   * @param pairingCode The scanned pairing code returned from the QR scanner.
   * @returns void
   */
  const onPairingCodeFound = useCallback(
    (pairingCode: string) => {
      if (isExpired) {
        navigation
          .getParent<StackNavigationProp<BCSCMainStackParams>>()
          ?.navigate(BCSCScreens.ReverifyAccount, { isExpired: true })
        return
      }

      if (!isVerified) {
        navigation.getParent<StackNavigationProp<BCSCMainStackParams>>()?.navigate(BCSCScreens.MainVerifyPrompt)
        return
      }

      navigation.navigate(BCSCQRCoreScreens.PairingCode, { pairingCode })
    },
    [isExpired, isVerified, navigation]
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

  const onMediatorInvitation = useCallback(
    (uri: string) => {
      navigation.getParent<StackNavigationProp<BCSCMainStackParams>>()?.navigate(BCSCScreens.ConfigureMediator, {
        scannedMediatorUri: uri,
      })
    },
    [navigation]
  )

  const pairingCodeQRCodeStrategy = usePairingCodeQRCodeStrategy(onPairingCodeFound)
  const accountTransferQRCodeStrategy = useAccountTransferQRCodeStrategy(onAccountTransferSuccess, onAlreadyVerified)
  const didCommOobQRCodeStrategy = useDidCommOobQRCodeStrategy(onConnectionFound, { onMediatorInvitation })

  // THOUGHT (MD): If this list grows too large, we may want to consider moving these strategies into a seperate hook
  const strategies = useMemo(
    () => [pairingCodeQRCodeStrategy, accountTransferQRCodeStrategy, didCommOobQRCodeStrategy],
    [accountTransferQRCodeStrategy, didCommOobQRCodeStrategy, pairingCodeQRCodeStrategy]
  )

  const { isProcessing, handleScan, resetLock } = useQRScanner(strategies)

  useFocusEffect(
    useCallback(() => {
      resetLock()
    }, [resetLock])
  )

  return <QRScanner isProcessing={isProcessing} onScan={handleScan} />
}

export default QRScannerScreen
