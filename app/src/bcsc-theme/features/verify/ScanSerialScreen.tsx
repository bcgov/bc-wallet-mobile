import useApi from '@/bcsc-theme/api/hooks/useApi'
import { useCardScanner } from '@/bcsc-theme/hooks/useCardScanner'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { DriversLicenseMetadata, ScanableCode } from '@/bcsc-theme/utils/decoder-strategy/DecoderStrategy'
import { BCDispatchAction, BCState } from '@/store'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import CodeScanningCamera from '../../components/CodeScanningCamera'

type ScanSerialScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.ManualSerial>
}

// TODO (MD): Rename to ScanCardScreen
const ScanSerialScreen: React.FC<ScanSerialScreenProps> = ({ navigation }: ScanSerialScreenProps) => {
  const { t } = useTranslation()
  const { ColorPalette, Spacing } = useTheme()
  const { authorization } = useApi()
  const [, dispatch] = useStore<BCState>()
  const { scanCard } = useCardScanner()

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

  const handleScanBCServicesCard = async (bcscSerial: string) => {
    dispatch({ type: BCDispatchAction.UPDATE_SERIAL, payload: [bcscSerial] })
    navigation.reset({ index: 0, routes: [{ name: BCSCScreens.SetupSteps }, { name: BCSCScreens.EnterBirthdate }] })
  }

  const handleScanComboCard = async (bcscSerial: string, license: DriversLicenseMetadata) => {
    dispatch({ type: BCDispatchAction.UPDATE_SERIAL, payload: [bcscSerial] })
    dispatch({ type: BCDispatchAction.UPDATE_BIRTHDATE, payload: [license.birthDate] })

    try {
      const deviceAuth = await authorization.authorizeDevice(bcscSerial, license.birthDate)
      dispatch({ type: BCDispatchAction.UPDATE_DEVICE_AUTHORIZATION, payload: [deviceAuth] })
      navigation.reset({ index: 0, routes: [{ name: BCSCScreens.SetupSteps }] })
    } catch (error) {
      navigation.reset({ index: 0, routes: [{ name: BCSCScreens.SetupSteps }, { name: BCSCScreens.MismatchedSerial }] })
    }
  }

  const handleScanDriversLicense = async () => {
    // TODO (MD): Notify the user that they need to scan a BCSC card or enter serial manually.
  }

  const onCodeScanned = async (barcodes: ScanableCode[]) => {
    await scanCard(barcodes, handleScanComboCard, handleScanBCServicesCard, handleScanDriversLicense)
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
