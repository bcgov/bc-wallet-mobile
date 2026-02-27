import { PermissionDisabled } from '@/bcsc-theme/components/PermissionDisabled'
import { useCardScanner } from '@/bcsc-theme/hooks/useCardScanner'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { ScanableCode } from '@/bcsc-theme/utils/decoder-strategy/DecoderStrategy'
import { useAutoRequestPermission } from '@/hooks/useAutoRequestPermission'
import { Button, ButtonType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useCameraPermission } from 'react-native-vision-camera'
import CodeScanningCamera from '../../components/CodeScanningCamera'
import { BCSC_SN_SCAN_ZONES } from '../../components/utils/camera'
import { LoadingScreenContent } from '../../features/splash-loading/LoadingScreenContent'

type ScanSerialScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.ManualSerial>
}

/**
 * Screen for scanning BC Services Card barcodes.
 * Camera fills the entire screen to fit a standard ID card (CR-80, ~85.6×53.98mm).
 * DL's are ignored, Combo, Photo, and Non-Photo cards are accepted
 */
const ScanSerialScreen: React.FC<ScanSerialScreenProps> = ({ navigation }: ScanSerialScreenProps) => {
  const { t } = useTranslation()
  const { ColorPalette, Spacing } = useTheme()
  const { hasPermission, requestPermission } = useCameraPermission()
  const scanner = useCardScanner()

  const { isLoading } = useAutoRequestPermission(hasPermission, requestPermission)

  const onCodeScanned = async (barcodes: ScanableCode[]): Promise<boolean | void> => {
    let accepted = true
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

      // DL-only or unrecognised — reject so the camera resets
      accepted = false
    })
    return accepted
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000',
      justifyContent: 'flex-end',
    },
    overlay: {
      flexShrink: 1,
      borderTopLeftRadius: Spacing.md,
      borderTopRightRadius: Spacing.md,
      backgroundColor: ColorPalette.brand.primaryBackground + 'E6',
      paddingHorizontal: Spacing.md,
    },
    instructionText: {
      textAlign: 'center',
      flexWrap: 'wrap',
      flexShrink: 1,
      marginVertical: Spacing.md,
    },
  })

  if (isLoading) {
    return <LoadingScreenContent loading={isLoading} onLoaded={() => {}} />
  }

  if (!hasPermission) {
    return <PermissionDisabled permissionType="camera" />
  }

  return (
    <View style={styles.container}>
      {/* Camera fills the entire screen */}
      <CodeScanningCamera
        onCodeScanned={onCodeScanned}
        cameraType={'back'}
        initialZoom={2}
        scanZones={BCSC_SN_SCAN_ZONES}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.overlay} pointerEvents="box-none">
        <ThemedText maxFontSizeMultiplier={1} style={styles.instructionText}>
          {t('BCSC.Instructions.Paragraph')}
        </ThemedText>
        <Button
          title={t('BCSC.Instructions.EnterManually')}
          buttonType={ButtonType.Secondary}
          onPress={() => navigation.navigate(BCSCScreens.ManualSerial)}
          accessibilityLabel={t('BCSC.Instructions.EnterManually')}
          testID={testIdWithKey('EnterManually')}
        />
        <SafeAreaView edges={['bottom']} />
      </View>
    </View>
  )
}

export default ScanSerialScreen
