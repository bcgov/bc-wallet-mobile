import { PermissionDisabled } from '@/bcsc-theme/components/PermissionDisabled'
import { useCardScanner } from '@/bcsc-theme/hooks/useCardScanner'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { ScanableCode } from '@/bcsc-theme/utils/decoder-strategy/DecoderStrategy'
import { useAutoRequestPermission } from '@/hooks/useAutoRequestPermission'
import { Button, ButtonType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Animated, LayoutAnimation, Platform, Pressable, StyleSheet, Switch, UIManager, View } from 'react-native'
import { useCameraPermission } from 'react-native-vision-camera'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Spacing } from '../../../bcwallet-theme/theme'
import CodeScanningCamera from '../../components/CodeScanningCamera'
import { BCSC_SN_SCAN_ZONES } from '../../components/utils/camera'
import { LoadingScreenContent } from '../../features/splash-loading/LoadingScreenContent'

/**
 * Scan Zone for the 2 barcodes:
  scanZones={Platform.select({
    default: [
      { types: ['code-39'], box: { x: 0.39, y: 0.1455, width: 0.50, height: 0.0616 } },
      { types: ['pdf-417'], box: { x: 0.7, y: 0.32, width: 0.20, height: 0.38 } },
    ],
  })}
*/
// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

/** Feature flag: when true, shows debug controls (barcode highlight toggle, scan zone tracking). */
const DEBUG_MODE = false

/** Feature flag: when false, the bottom overlay is always expanded and cannot be collapsed. */
const ENABLE_COLLAPSIBLE_OVERLAY = false

type ScanSerialScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.ManualSerial>
}

/**
 * Screen for scanning BC Services Card and Driver's License barcodes.
 * Camera fills the entire screen to fit a standard ID card (CR-80, ~85.6×53.98mm).
 * Instructions and controls live in a collapsible overlay at the bottom.
 */
const ScanSerialScreen: React.FC<ScanSerialScreenProps> = ({ navigation }: ScanSerialScreenProps) => {
  const { t } = useTranslation()
  const { ColorPalette } = useTheme()
  const { hasPermission, requestPermission } = useCameraPermission()
  const scanner = useCardScanner()

  // Toggle for barcode highlight feature (always on when not in debug mode)
  const [showBarcodeHighlight, setShowBarcodeHighlight] = useState(false)
  // Toggle for scan zone tracking/saving (always off when not in debug mode)
  const [enableScanZones, setEnableScanZones] = useState(false)
  // Collapsible overlay state
  const [overlayExpanded, setOverlayExpanded] = useState(!ENABLE_COLLAPSIBLE_OVERLAY)
  const chevronRotation = useRef(new Animated.Value(ENABLE_COLLAPSIBLE_OVERLAY ? 0 : 1)).current

  const toggleOverlay = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setOverlayExpanded((prev) => {
      Animated.timing(chevronRotation, {
        toValue: prev ? 0 : 1,
        duration: 250,
        useNativeDriver: true,
      }).start()
      return !prev
    })
  }, [chevronRotation])

  const chevronRotateInterpolate = chevronRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  })

  const { isLoading } = useAutoRequestPermission(hasPermission, requestPermission)

  const onCodeScanned = async (barcodes: ScanableCode[]) => {
    await scanner.scanCard(barcodes, async (bcscSerial, license) => {
      if (bcscSerial && license) {
        scanner.completeScan()
        await scanner.handleScanComboCard(bcscSerial, license)
        return
      }

      if (bcscSerial) {
        scanner.completeScan()
        await scanner.handleScanBCServicesCard(bcscSerial)
        return
      }

      if (license) {
        // TODO (MD): Handle when drivers license barcode scanned. Current V3 app provides no user feedback.
        // Don't complete the scan so user can try a different barcode
        return
      }
    })
  }

  if (isLoading) {
    return <LoadingScreenContent loading={isLoading} onLoaded={() => {}} />
  }

  if (!hasPermission) {
    return <PermissionDisabled permissionType="camera" />
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Camera fills the entire screen */}
      <CodeScanningCamera
        onCodeScanned={onCodeScanned}
        cameraType={'back'}
        showBarcodeHighlight={showBarcodeHighlight}
        enableScanZones={enableScanZones}
        initialZoom={2}
        scanZones={BCSC_SN_SCAN_ZONES}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Collapsible overlay at bottom */}
      <View style={styles.overlayWrapper} pointerEvents="box-none">
        <View style={[styles.overlay, { backgroundColor: ColorPalette.brand.primaryBackground + 'E6' }]}>
          {/* Drag handle / collapse toggle */}
          {ENABLE_COLLAPSIBLE_OVERLAY && (
            <Pressable onPress={toggleOverlay} style={styles.handleContainer} hitSlop={8}>
              <View style={[styles.handle, { backgroundColor: ColorPalette.grayscale.mediumGrey }]} />
              <Animated.Text
                style={[
                  styles.chevron,
                  { color: ColorPalette.grayscale.mediumGrey, transform: [{ rotate: chevronRotateInterpolate }] },
                ]}
              >
                {'\u25B2'}
              </Animated.Text>
            </Pressable>
          )}

          {/* Collapsed: brief instruction */}
          <ThemedText style={styles.collapsedText}>{t('BCSC.Instructions.Paragraph')}</ThemedText>

          {/* Expanded content */}
          {overlayExpanded && (
            <View style={styles.expandedContent}>
              {/* Debug toggles — only shown in debug mode */}
              {DEBUG_MODE && (
                <>
                  {/* Barcode highlight toggle */}
                  <View style={styles.toggleRow}>
                    <ThemedText style={styles.toggleLabel}>
                      {t('BCSC.Scanner.ShowBarcodeHighlight', 'Show Barcode Highlight')}
                    </ThemedText>
                    <Switch
                      value={showBarcodeHighlight}
                      onValueChange={setShowBarcodeHighlight}
                      trackColor={{ false: ColorPalette.grayscale.mediumGrey, true: ColorPalette.brand.primary }}
                      thumbColor={ColorPalette.grayscale.white}
                    />
                  </View>

                  {/* Scan zone tracking toggle */}
                  {showBarcodeHighlight && (
                    <View style={styles.toggleRow}>
                      <ThemedText style={styles.toggleLabel}>
                        {t('BCSC.Scanner.TrackScanZones', 'Track/Save Scan Zones')}
                      </ThemedText>
                      <Switch
                        value={enableScanZones}
                        onValueChange={setEnableScanZones}
                        trackColor={{ false: ColorPalette.grayscale.mediumGrey, true: ColorPalette.brand.primary }}
                        thumbColor={ColorPalette.grayscale.white}
                      />
                    </View>
                  )}
                </>
              )}

              <View style={{ marginTop: 'auto' }}>
                <Button
                  title={t('BCSC.Instructions.EnterManually')}
                  buttonType={ButtonType.Secondary}
                  onPress={() => navigation.navigate(BCSCScreens.ManualSerial)}
                  accessibilityLabel={t('BCSC.Instructions.EnterManually')}
                  testID={testIdWithKey('EnterManually')}
                />
              </View>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlayWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 5,
  },
  overlay: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    height: '40%',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  chevron: {
    fontSize: 10,
  },
  collapsedText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    marginTop: Spacing.xl,
  },
  expandedContent: {
    flex: 1,
    marginTop: 4,
    gap: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  toggleLabel: {
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
})

export default ScanSerialScreen
