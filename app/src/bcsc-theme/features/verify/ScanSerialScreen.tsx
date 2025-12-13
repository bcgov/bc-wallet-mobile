import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import {
  DecodedCodeKind,
  decodeScannedCode,
  DriversLicenseDecodedBarcode,
  ScanableCode,
} from '@/bcsc-theme/utils/decoder-strategy/DecoderStrategy'
import { BCState } from '@/store'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import CodeScanningCamera from '../../components/CodeScanningCamera'

const MIN_CAMERA_CAPTURE_ATTEMPTS = 40

const maxSerialNumberLength = 15

type DriversLicenseDecodedMetadata = Omit<DriversLicenseDecodedBarcode, 'kind'>

type ScanSerialScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.ManualSerial>
}

const ScanSerialScreen: React.FC<ScanSerialScreenProps> = ({ navigation }: ScanSerialScreenProps) => {
  const { t } = useTranslation()
  const { ColorPalette, Spacing } = useTheme()
  const [store, dispatch] = useStore<BCState>()
  const [serial, setSerial] = useState(store.bcsc.serial ?? '')
  // const decodedCardMetadataRef = useRef<DecodedCode | null>(null)

  const scanCompletedRef = useRef(false)
  const cardSerialRef = useRef<string | null>()
  const cardCaptureAttemptsRef = useRef(0)
  const licenseMetadataRef = useRef<DriversLicenseDecodedMetadata | null>(null)

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

  // Paths:
  // 	1. Card has serial and license metadata (combo dual barcode or 2025+ combo card DL barcode)
  // 		 Outcome: validate serial -> save serial and license -> navigate to setup steps verification
  //
  //  2. Card has serial but no license metadata (BCSC card with single barcode)
  //  	 Outcome: validate serial -> save serial -> navigate to enter birthdate
  //
  //  3. Card has only license metadata (DL card)
  //  	 Outcome: navigate to manual serial entry with prefilled license metadata
  //
  //  4. Card has neither serial nor license metadata
  //  	 Outcome: continue scanning until max attempts reached
  const onCodeScanned = (codes: ScanableCode[]) => {
    if (scanCompletedRef.current) {
      return
    }

    cardCaptureAttemptsRef.current += 1

    for (const code of codes) {
      const decodedCode = decodeScannedCode(code)

      if (!decodedCode) {
        // TODO (MD): What to do if we can't decode the barcode?
        return
      }

      switch (decodedCode.kind) {
        case DecodedCodeKind.BCServicesComboCardCardBarcode:
          cardSerialRef.current = decodedCode.bcscSerial
          licenseMetadataRef.current = decodedCode
          break
        case DecodedCodeKind.DriversLicenseBarcode:
          licenseMetadataRef.current = decodedCode
          break
        case DecodedCodeKind.BCServicesCardBarcode:
          cardSerialRef.current = decodedCode.bcscSerial
          break
      }
    }

    if (!store.bcsc.userMetadata && !store.bcsc.serial && licenseMetadataRef.current && cardSerialRef.current) {
      //dispatch({ type: 'BCSC_UPDATE_SERIAL', payload: [cardSerialRef.current] })
      // dispatch({
      //   type: BCDispatchAction.UPDATE_USER_NAME_METADATA,
      //   payload: [
      //     {
      //       first: licenseMetadataRef.current.firstName,
      //       middle: licenseMetadataRef.current.middleNames,
      //       last: licenseMetadataRef.current.lastName,
      //     },
      //   ],
      // })
      // dispatch({
      //   type: BCDispatchAction.UPDATE_USER_ADDRESS_METADATA,
      //   payload: [
      //     {
      //       streetAddress: licenseMetadataRef.current.streetAddress,
      //       city: licenseMetadataRef.current.city,
      //       province: licenseMetadataRef.current.province,
      //       postalCode: licenseMetadataRef.current.postalCode,
      //     },
      //   ],
      // })
    }

    if (cardCaptureAttemptsRef.current < MIN_CAMERA_CAPTURE_ATTEMPTS) {
      console.log(cardCaptureAttemptsRef.current, Boolean(cardSerialRef.current), Boolean(licenseMetadataRef.current))
      return
    }

    // for (const code of val) {
    //   // setSerial(code.value)
    //   // TODO (MD): Reimplement this logic
    //   // if (validateSerial()) {
    //   //   dispatch({ type: BCDispatchAction.UPDATE_SERIAL, payload: [code.value] })
    //   //   navigation.navigate(BCSCScreens.EnterBirthdate)
    //   //   return
    //   // }
    // }
  }

  return (
    <ScreenWrapper padded={false} scrollable={false} style={styles.screenContainer} edges={['bottom', 'left', 'right']}>
      <View style={styles.cameraContainer}>
        <CodeScanningCamera
          // QUESTION (MD): Is code-128 needed?
          codeTypes={['code-128', 'code-39', 'pdf-417']}
          onCodeScanned={onCodeScanned}
          cameraType={'back'}
        />
      </View>
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
  )
}

export default ScanSerialScreen
