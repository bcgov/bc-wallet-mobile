import { useCardScanner } from '@/bcsc-theme/hooks/useCardScanner'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { ScanableCode } from '@/bcsc-theme/utils/decoder-strategy/DecoderStrategy'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import CodeScanningCamera from '../../components/CodeScanningCamera'

type ScanSerialScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.ManualSerial>
}

const ScanSerialScreen: React.FC<ScanSerialScreenProps> = ({ navigation }: ScanSerialScreenProps) => {
  const { t } = useTranslation()
  const { ColorPalette, Spacing } = useTheme()
  const { scanCard, handleScanBCServicesCard, handleScanComboCard } = useCardScanner()

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

  const onCodeScanned = async (barcodes: ScanableCode[]) => {
    await scanCard(barcodes, async (bcscSerial, license) => {
      if (bcscSerial && license) {
        return handleScanComboCard(bcscSerial, license)
      }

      if (bcscSerial) {
        return handleScanBCServicesCard(bcscSerial)
      }
    })
  }

  return (
    <>
      <CodeScanningCamera codeTypes={['code-39', 'pdf-417']} onCodeScanned={onCodeScanned} cameraType={'back'} />
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
