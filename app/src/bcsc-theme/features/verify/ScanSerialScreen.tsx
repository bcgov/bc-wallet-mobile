import { useCardScanner } from '@/bcsc-theme/hooks/useCardScanner'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { ScanableCode } from '@/bcsc-theme/utils/decoder-strategy/DecoderStrategy'
import { useAutoRequestPermission } from '@/hooks/useAutoRequestPermission'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { PermissionDisabled } from '@/bcsc-theme/components/PermissionDisabled'
import { useCameraPermission } from 'react-native-vision-camera'
import CodeScanningCamera from '../../components/CodeScanningCamera'

type ScanSerialScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.ManualSerial>
}

const ScanSerialScreen: React.FC<ScanSerialScreenProps> = ({ navigation }: ScanSerialScreenProps) => {
  const { t } = useTranslation()
  const { ColorPalette, Spacing } = useTheme()
  const { hasPermission, requestPermission } = useCameraPermission()
  const scanner = useCardScanner()

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
  })

  useAutoRequestPermission(hasPermission, requestPermission)

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

  if (!hasPermission) {
    return <PermissionDisabled permissionType="camera" />
  }

  return (
    <>
      <CodeScanningCamera codeTypes={scanner.codeTypes} onCodeScanned={onCodeScanned} cameraType={'back'} />
      <ScreenWrapper
        padded={false}
        scrollable={false}
        style={styles.screenContainer}
        edges={['bottom', 'left', 'right']}
      >
        <View style={styles.contentContainer}>
          <View>
            <ThemedText style={{ marginBottom: Spacing.sm }}>{t('BCSC.Instructions.Paragraph')}</ThemedText>
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
