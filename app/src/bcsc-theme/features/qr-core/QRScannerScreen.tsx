import { BCSCMainStackParams, BCSCQRCoreScreens, BCSCQRCoreTabParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback } from 'react'

import QRScanner from './QRScanner'
import useScanScreenViewModel from './useScanScreenViewModel'

const QRScannerScreen: React.FC = () => {
  const navigation = useNavigation<BottomTabNavigationProp<BCSCQRCoreTabParams>>()

  const onConnectionFound = useCallback(
    (oobRecordId: string) => {
      // QRScannerScreen sits inside QRCoreStack (a tab navigator); ConnectionLoading
      // lives on MainStack, so escape up via getParent before navigating.
      navigation
        .getParent<StackNavigationProp<BCSCMainStackParams>>()
        ?.navigate(BCSCScreens.ConnectionLoading, { oobRecordId })
    },
    [navigation]
  )

  const onPairingCodeFound = useCallback(
    (pairingCode: string) => {
      navigation.navigate(BCSCQRCoreScreens.PairingCode, { pairingCode })
    },
    [navigation]
  )

  const { isPermissionLoading, hasPermission, isProcessing, scanError, handleScan, dismissError, resetNavigationLock } =
    useScanScreenViewModel({ onConnectionFound, onPairingCodeFound })

  // QRCoreStack has `unmountOnBlur: false` so the scanner persists across the
  // ConnectionLoading round trip; reset the nav lock on each focus so the
  // user can scan again after completing a flow.
  useFocusEffect(
    useCallback(() => {
      resetNavigationLock()
    }, [resetNavigationLock])
  )

  return (
    <QRScanner
      isPermissionLoading={isPermissionLoading}
      hasPermission={hasPermission}
      isProcessing={isProcessing}
      scanError={scanError}
      onScan={handleScan}
      onDismissError={dismissError}
    />
  )
}

export default QRScannerScreen
