import { PermissionDisabled } from '@/bcsc-theme/components/PermissionDisabled'
import { QRScannerFrame } from '@/bcsc-theme/components/QRScannerFrame'
import { LoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { hitSlop } from '@/constants'
import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { useAutoRequestPermission } from '@/hooks/useAutoRequestPermission'
import { TestIds } from '@/test-ids/registry'
import { ScanCamera, testIdWithKey, useTheme } from '@bifold/core'
import { useFocusEffect } from '@react-navigation/native'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useCameraPermission } from 'react-native-vision-camera'

const RESCAN_DELAY_MS = 1000

export interface QRScannerProps {
  isProcessing: boolean
  onScan: (value: string) => Promise<void>
}

/**
 * Presentational QR scanner shared by every scan entry point. It owns the camera UI only; what a scanned
 * value means (strategies, API calls, navigation) belongs to the screen's ViewModel.
 */
const QRScanner = ({ isProcessing, onScan }: QRScannerProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()
  const [torchActive, setTorchActive] = useState(false)
  const { hasPermission, requestPermission } = useCameraPermission()
  const { isLoading: isPermissionLoading } = useAutoRequestPermission(hasPermission, requestPermission)
  const [scannerKey, setScannerKey] = useState(0)
  const { isErrorModalVisible } = useErrorAlert()
  const modalWasVisibleRef = useRef(false)
  const hasFocused = useRef(false)

  // Ref to prevent stale closure issues in the focus effect
  const isProcessingRef = useRef(isProcessing)
  isProcessingRef.current = isProcessing

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
      if (hasFocused.current && !isProcessingRef.current) {
        setScannerKey((prevKey) => prevKey + 1) // remount ScanCamera to clear its frozen state
      }
      hasFocused.current = true
    }, [])
  )

  useEffect(() => {
    const modalJustClosed = modalWasVisibleRef.current && !isErrorModalVisible
    modalWasVisibleRef.current = isErrorModalVisible

    if (!modalJustClosed) {
      return
    }

    // Remount ScanCamera to clear its frozen state, once the modal has finished dismissing
    const timer = setTimeout(() => setScannerKey((prevKey) => prevKey + 1), RESCAN_DELAY_MS)
    return () => clearTimeout(timer)
  }, [isErrorModalVisible])

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
      {/* Camera preview + bifold's unlabeled tap-to-focus Pressable: nothing here for a screen reader. */}
      <View style={StyleSheet.absoluteFill} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <ScanCamera key={scannerKey} handleCodeScan={onScan} torchActive={torchActive} />
      </View>
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
    </View>
  )
}

export default QRScanner
