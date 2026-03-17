import { PermissionDisabled } from '@/bcsc-theme/components/PermissionDisabled'
import { LoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { DismissiblePopupModal, MaskType, ScanCamera, SVGOverlay, ThemedText, useTheme } from '@bifold/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import useTransferQRScannerViewModel from './useTransferQRScannerViewModel'

const TransferQRScannerScreen: React.FC = () => {
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()
  const { isLoading, isPermissionLoading, hasPermission, scanError, handleScan, dismissError } =
    useTransferQRScannerViewModel()

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
        <SVGOverlay maskType={MaskType.QR_CODE} strokeColor={ColorPalette.grayscale.white} />
      </View>
      <View style={styles.messageContainer}>
        <Icon name="qrcode-scan" size={40} style={styles.icon} />
        <ThemedText variant="title">{t('BCSC.Scan.WillScanAutomatically')}</ThemedText>
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
