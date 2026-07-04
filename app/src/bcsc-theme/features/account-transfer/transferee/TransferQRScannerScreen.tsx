import { PermissionDisabled } from '@/bcsc-theme/components/PermissionDisabled'
import { QRScannerOverlay } from '@/bcsc-theme/components/QRScannerOverlay'
import { LoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { DismissiblePopupModal, ScanCamera, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import useTransferQRScannerViewModel from './useTransferQRScannerViewModel'

type TransferQRScannerScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams>
}

const TransferQRScannerScreen: React.FC<TransferQRScannerScreenProps> = ({ navigation }) => {
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()
  const { isLoading, isPermissionLoading, hasPermission, scanError, handleScan, dismissError } =
    useTransferQRScannerViewModel(navigation)

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    icon: {
      color: ColorPalette.grayscale.white,
      padding: Spacing.md,
    },
    messageContainer: {
      marginHorizontal: 40,
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      paddingTop: 30,
    },
    messageText: {
      color: ColorPalette.grayscale.white,
      flexShrink: 1,
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
      <View pointerEvents="none">
        <QRScannerOverlay />
      </View>
      <View style={styles.messageContainer}>
        <Icon name="qrcode-scan" size={40} style={styles.icon} />
        <ThemedText style={styles.messageText}>{t('BCSC.Scan.WillScanAutomatically')}</ThemedText>
      </View>
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
