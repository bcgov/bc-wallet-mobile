import { PermissionDisabled } from '@/bcsc-theme/components/PermissionDisabled'
import { LoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { BCSCMainStackParams, BCSCQRCoreScreens, BCSCQRCoreTabParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { hitSlop } from '@/constants'
import {
  DismissiblePopupModal,
  MaskType,
  ScanCamera,
  SVGOverlay,
  testIdWithKey,
  ThemedText,
  useTheme,
} from '@bifold/core'
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

import useScanScreenViewModel from './useScanScreenViewModel'

const QRScanner: React.FC = () => {
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()
  const navigation = useNavigation<BottomTabNavigationProp<BCSCQRCoreTabParams>>()
  const [torchActive, setTorchActive] = useState(false)

  const onConnectionFound = useCallback(
    (oobRecordId: string) => {
      // QRScanner sits inside QRCoreStack (a tab navigator); ConnectionLoading
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

  const styles = StyleSheet.create({
    container: { flex: 1 },
    overlay: { ...StyleSheet.absoluteFillObject },
    messageContainer: {
      marginHorizontal: 40,
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      paddingTop: 30,
    },
    icon: { color: ColorPalette.grayscale.white, padding: Spacing.md },
    text: { color: ColorPalette.grayscale.white },
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
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
  })

  if (isPermissionLoading) {
    return <LoadingScreen />
  }
  if (!hasPermission) {
    return <PermissionDisabled permissionType="camera" />
  }

  // ScanCamera owns the camera-frame dedupe (hasFiredRef + cameraActive). If we
  // unmount it while processing, those reset on remount and the same QR — still
  // in the user's frame — re-fires, queuing a duplicate connection. Overlay the
  // spinner instead so the dedupe state survives the in-flight strategy.handle.
  return (
    <View style={styles.container}>
      <ScanCamera handleCodeScan={handleScan} enableCameraOnError={true} torchActive={torchActive} error={scanError} />
      <View pointerEvents="none" style={styles.overlay}>
        <SVGOverlay maskType={MaskType.QR_CODE} strokeColor={ColorPalette.grayscale.white} />
      </View>
      <View style={styles.messageContainer}>
        <Icon name="qrcode-scan" size={40} style={styles.icon} />
        <ThemedText variant="title" style={styles.text}>
          {t('BCSC.Scan.WillScanAutomatically')}
        </ThemedText>
      </View>
      <TouchableOpacity
        style={styles.torchButton}
        onPress={() => setTorchActive((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={t(torchActive ? 'BCSC.Scan.TorchOff' : 'BCSC.Scan.TorchOn')}
        hitSlop={hitSlop}
        testID={testIdWithKey('TorchToggle')}
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
          onCallToActionPressed={dismissError}
          onDismissPressed={dismissError}
        />
      )}
    </View>
  )
}

export default QRScanner
