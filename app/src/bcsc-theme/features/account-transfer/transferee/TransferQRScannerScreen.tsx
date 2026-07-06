import { PermissionDisabled } from '@/bcsc-theme/components/PermissionDisabled'
import { getCutoutRect, QRScannerOverlay } from '@/bcsc-theme/components/QRScannerOverlay'
import { LoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { DismissiblePopupModal, ScanCamera, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, useWindowDimensions, View } from 'react-native'
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

  // Camera area dimensions drive the overlay's reticle position and the instructions
  // placement. The window is a close-enough first render; onLayout provides the real
  // size (the window includes the header, which sits above this screen's container).
  const window = useWindowDimensions()
  const [cameraArea, setCameraArea] = useState({ width: window.width, height: window.height })
  const cutout = getCutoutRect(cameraArea.width, cameraArea.height)

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    icon: {
      color: ColorPalette.grayscale.white,
    },
    messageContainer: {
      // Centered in the gap between the header and the reticle
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: cutout.y,
      paddingHorizontal: 40,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.md,
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
    <View
      style={styles.container}
      onLayout={(event) =>
        setCameraArea({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })
      }
    >
      <ScanCamera handleCodeScan={handleScan} enableCameraOnError={true} error={scanError} />
      <View pointerEvents="none">
        <QRScannerOverlay width={cameraArea.width} height={cameraArea.height} />
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
