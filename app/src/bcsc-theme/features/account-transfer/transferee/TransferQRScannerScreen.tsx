import { PermissionDisabled } from '@/bcsc-theme/components/PermissionDisabled'
import { QRScannerFrame } from '@/bcsc-theme/components/QRScannerFrame'
import { LoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { DismissiblePopupModal, ScanCamera } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import useTransferQRScannerViewModel from './useTransferQRScannerViewModel'

type TransferQRScannerScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams>
}

const TransferQRScannerScreen: React.FC<TransferQRScannerScreenProps> = ({ navigation }) => {
  const { t } = useTranslation()
  const { isLoading, isPermissionLoading, hasPermission, scanError, handleScan, dismissError } =
    useTransferQRScannerViewModel(navigation)

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
  })

  if (isPermissionLoading) {
    return <LoadingScreen />
  }

  if (!hasPermission) {
    return <PermissionDisabled permissionType="camera" />
  }

  if (isLoading) {
    return <ActivityIndicator size={'large'} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />
  }

  return (
    <View style={styles.container}>
      <ScanCamera handleCodeScan={handleScan} enableCameraOnError={true} error={scanError} />
      <QRScannerFrame message={t('BCSC.Scan.WillScanAutomatically')} />
      {scanError && (
        <DismissiblePopupModal
          title={t('BCSC.Scan.ErrorDetails')}
          description={scanError.message}
          onCallToActionLabel={t('BCSC.Scan.Dismiss')}
          onCallToActionPressed={dismissError}
          onDismissPressed={dismissError}
        />
      )}
    </View>
  )
}

export default TransferQRScannerScreen
