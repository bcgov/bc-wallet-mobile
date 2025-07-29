import { Button, ButtonType, testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { BCDispatchAction, BCState } from '@/store'
import { StackNavigationProp } from '@react-navigation/stack'
import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'

import CodeScanningCamera from '../../components/CodeScanningCamera'

const maxSerialNumberLength = 15

type ScanSerialScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.ManualSerial>
}

const ScanSerialScreen: React.FC<ScanSerialScreenProps> = ({ navigation }: ScanSerialScreenProps) => {
  const { t } = useTranslation()
  const { ColorPalette, Spacing } = useTheme()
  const [store, dispatch] = useStore<BCState>()
  const [serial, setSerial] = useState(store.bcsc.serial ?? '')

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

    // below used as helpful label for view, no properties needed atp
    controlsContainer: {},

    buttonContainer: {
      width: '100%',
    },
  })

  const validateSerial = useCallback(() => {
    // TODO: update this validation logic
    // once we know the serial number format
    if (serial.length < 1) {
      return false
    }
    if (serial.length > maxSerialNumberLength) {
      return false
    }
    return true
  }, [serial])

  const onCodeScanned = (val: any) => {
    // the scanner might pick up multiple codes
    // we will take the first valid one

    interface ScannedCode {
      value: string
      [key: string]: unknown
    }
    for (const code of val as ScannedCode[]) {
      setSerial(code.value)

      if (validateSerial()) {
        dispatch({ type: BCDispatchAction.UPDATE_SERIAL, payload: [code.value] })
        navigation.navigate(BCSCScreens.EnterBirthdate)
        return
      }
    }
  }

  return (
    <View style={styles.screenContainer}>
      <View style={styles.cameraContainer}>
        <CodeScanningCamera codeTypes={['code-128']} onCodeScanned={onCodeScanned} cameraType={'back'} />
      </View>
      <View style={styles.contentContainer}>
        <View>
          <ThemedText style={{ marginBottom: Spacing.sm }}>{t('Unified.Instructions.Paragraph')}</ThemedText>
        </View>
        <View style={styles.buttonContainer}>
          <Button
            title={t('Unified.Instructions.EnterManually')}
            buttonType={ButtonType.Secondary}
            onPress={() => navigation.navigate(BCSCScreens.ManualSerial)}
            accessibilityLabel={t('Unified.Instructions.EnterManually')}
            testID={testIdWithKey('EnterManually')}
          />
        </View>
      </View>
    </View>
  )
}

export default ScanSerialScreen
