import { PermissionDisabled } from '@/bcsc-theme/components/PermissionDisabled'
import { QRScannerFrame } from '@/bcsc-theme/components/QRScannerFrame'
import { LoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { hitSlop } from '@/constants'
import { useAutoRequestPermission } from '@/hooks/useAutoRequestPermission'
import { TestIds } from '@/test-ids/registry'
import { DismissiblePopupModal, QrCodeScanError, ScanCamera, testIdWithKey, useTheme } from '@bifold/core'
import { useFocusEffect } from '@react-navigation/native'
import { default as React, useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useCameraPermission } from 'react-native-vision-camera'

export interface QRScannerProps {
  isProcessing: boolean
  scanError: QrCodeScanError | null
  onScan: (value: string) => Promise<void>
  onDismissError: () => void
}

/**
 * Presentational QR scanner shared by every scan entry point. It owns the camera UI only; what a scanned
 * value means (strategies, API calls, navigation) belongs to the screen's ViewModel.
 */
const QRScanner = ({ isProcessing, scanError, onScan, onDismissError }: QRScannerProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()
  const [torchActive, setTorchActive] = useState(false)
  const { hasPermission, requestPermission } = useCameraPermission()
  const { isLoading: isPermissionLoading } = useAutoRequestPermission(hasPermission, requestPermission)
  const [scannerKey, setScannerKey] = useState(0)
  const hasFocused = useRef(false)

  const styles = StyleSheet.create({
    container: { flex: 1 },
    torchButton: {
      position: 'absolute',
      bottom: Spacing.lg,
      right: Spacing.lg,
      backgroundColor: torchActive ? ColorPalette.grayscale.white : 'rgba(0,0,0,0.4)',
      borderRadius: 24,
      padding: Spacing.sm,
    },
    torchIcon: {
      color: torchActive ? ColorPalette.grayscale.black : ColorPalette.grayscale.white,
    },
    processingOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
  })

  useFocusEffect(
    useCallback(() => {
      if (hasFocused.current) {
        setScannerKey((prevKey) => prevKey + 1) // remount ScanCamera to clear its frozen state
      }
      hasFocused.current = true
    }, [])
  )

  if (isPermissionLoading) {
    return <LoadingScreen />
  }
  if (!hasPermission) {
    return <PermissionDisabled permissionType="camera" />
  }

  // ScanCamera owns the camera-frame dedupe (hasFiredRef + cameraActive). If we
  // unmount it while processing, those reset on remount and the same QR — still
  // in the user's frame — re-fires, queuing a duplicate scan. Overlay the
  // spinner instead so the dedupe state survives the in-flight handler.
  return (
    <View style={styles.container}>
      <ScanCamera
        key={scannerKey}
        handleCodeScan={onScan}
        enableCameraOnError={true}
        torchActive={torchActive}
        error={scanError}
      />
      <QRScannerFrame message={t('BCSC.Scan.WillScanAutomatically')} />
      <TouchableOpacity
        style={styles.torchButton}
        onPress={() => setTorchActive((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={t(torchActive ? 'BCSC.Scan.TorchOff' : 'BCSC.Scan.TorchOn')}
        hitSlop={hitSlop}
        testID={testIdWithKey(TestIds.main.qrCore.torchToggle)}
      >
        <Icon name={torchActive ? 'flash' : 'flash-off'} size={28} style={styles.torchIcon} />
      </TouchableOpacity>
      {isProcessing && (
        <View style={styles.processingOverlay} pointerEvents="auto">
          <ActivityIndicator size="large" color={ColorPalette.grayscale.white} />
        </View>
      )}
      {scanError && (
        <DismissiblePopupModal
          title={t('BCSC.Scan.ErrorDetails')}
          description={scanError.message}
          onCallToActionLabel={t('BCSC.Scan.Dismiss')}
          onCallToActionPressed={onDismissError}
          onDismissPressed={onDismissError}
        />
      )}
    </View>
  )
}

export default QRScanner
