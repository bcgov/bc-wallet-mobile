import { PermissionDisabled } from '@/bcsc-theme/components/PermissionDisabled'
import { useCardScanner } from '@/bcsc-theme/hooks/useCardScanner'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { ScanableCode } from '@/bcsc-theme/utils/decoder-strategy/DecoderStrategy'
import { useAutoRequestPermission } from '@/hooks/useAutoRequestPermission'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Switch, View } from 'react-native'
import { useCameraPermission } from 'react-native-vision-camera'
import CodeScanningCamera from '../../components/CodeScanningCamera'
import { LoadingScreenContent } from '../../features/splash-loading/LoadingScreenContent'

type ScanSerialScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.ManualSerial>
}

/**
 * Screen for scanning BC Services Card and Driver's License barcodes
 * Supports scanning of small barcodes (code-39, code-128, PDF417) with enhanced features:
 * - Pinch-to-zoom for close-up scanning of small barcodes
 * - Tap-to-focus for precise focusing on barcode area
 * - Multiple barcode detection simultaneously
 * - Optional barcode highlight overlay for visual feedback
 */
const ScanSerialScreen: React.FC<ScanSerialScreenProps> = ({ navigation }: ScanSerialScreenProps) => {
  const { t } = useTranslation()
  const { ColorPalette, Spacing } = useTheme()
  const { hasPermission, requestPermission } = useCameraPermission()
  const scanner = useCardScanner()
  
  // Toggle for barcode highlight feature
  const [showBarcodeHighlight, setShowBarcodeHighlight] = useState(false)

  const styles = StyleSheet.create({
    screenContainer: {
      flex: 1,
      backgroundColor: ColorPalette.brand.primaryBackground,
      padding: Spacing.md,
    },
    cameraContainer: {
      flex: 1,
      marginBottom: Spacing.md,
    },
    contentContainer: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'space-between',
    },
    highlightToggleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.sm,
      paddingVertical: Spacing.xs,
    },
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
    <>
      <CodeScanningCamera
        codeTypes={scanner.codeTypes}
        onCodeScanned={onCodeScanned}
        cameraType={'back'}
        showBarcodeHighlight={showBarcodeHighlight}
        enableZoom={true}
        initialZoom={1.0}
        minZoom={1.0}
        maxZoom={4.0}
      />
      <ScreenWrapper
        padded={false}
        scrollable={false}
        style={styles.screenContainer}
        edges={['bottom', 'left', 'right']}
      >
        <View style={styles.contentContainer}>
          <View>
            <ThemedText style={{ marginBottom: Spacing.sm }}>{t('BCSC.Instructions.Paragraph')}</ThemedText>
            
            {/* Barcode highlight toggle */}
            <View style={styles.highlightToggleContainer}>
              <ThemedText>{t('BCSC.Scanner.ShowBarcodeHighlight', 'Show Barcode Highlight')}</ThemedText>
              <Switch
                value={showBarcodeHighlight}
                onValueChange={setShowBarcodeHighlight}
                trackColor={{ false: ColorPalette.grayscale.mediumGrey, true: ColorPalette.brand.primary }}
                thumbColor={ColorPalette.grayscale.white}
              />
            </View>
          </View>
          <View>
            <Button
              title={t('BCSC.Instructions.EnterManually')}
              buttonType={ButtonType.Secondary}
              onPress={() => navigation.navigate(BCSCScreens.ManualSerial)}
              accessibilityLabel={t('BCSC.Instructions.EnterManually')}
              testID={testIdWithKey('EnterManually')}
            />
          </View>
        </View>
      </ScreenWrapper>
    </>
  )
}

export default ScanSerialScreen
