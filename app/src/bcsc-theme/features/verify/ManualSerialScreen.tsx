import {
  Button,
  ButtonType,
  KeyboardView,
  LimitedTextInput,
  testIdWithKey,
  ThemedText,
  useStore,
  useTheme,
} from '@bifold/core'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native'

import { BCDispatchAction, BCState } from '@/store'
import { StackNavigationProp } from '@react-navigation/stack'
import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import SerialHighlightImage from '@assets/img/highlight_serial_barcode.png'

const SERIAL_HIGHLIGHT_IMAGE = Image.resolveAssetSource(SerialHighlightImage).uri

const twoThirds = 0.67
const maxSerialNumberLength = 15

type ErrorState = {
  visible: boolean
  description: string
}

type ManualSerialScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.ManualSerial>
}

const ManualSerialScreen: React.FC<ManualSerialScreenProps> = ({ navigation }: ManualSerialScreenProps) => {
  const { t } = useTranslation()
  const { ColorPalette, Spacing } = useTheme()
  const [store, dispatch] = useStore<BCState>()
  const [serial, setSerial] = useState(store.bcsc.serial ?? '')
  const { width } = useWindowDimensions()
  const [errorState, setErrorState] = useState<ErrorState>({
    visible: false,
    description: '',
  })

  const styles = StyleSheet.create({
    screenContainer: {
      flex: 1,
      backgroundColor: ColorPalette.brand.primaryBackground,
      padding: Spacing.md,
      justifyContent: 'space-between',
    },
    contentContainer: {
      flexDirection: 'column',
    },
    image: {
      width: width - Spacing.md * 2,
      height: (width - Spacing.md * 2) * twoThirds,
      marginBottom: Spacing.md,
    },
    error: {
      color: ColorPalette.semantic.error,
      marginBottom: Spacing.sm,
    },

    // below used as helpful label for view, no properties needed atp
    controlsContainer: {},

    buttonContainer: {
      width: '100%',
    },
  })

  const handleChangeText = useCallback((text: string) => {
    setSerial(text)
  }, [])

  const onContinuePressed = useCallback(() => {
    if (serial.length < 1) {
      setErrorState({
        description: t('Unified.ManualSerial.EmptySerialError'),
        visible: true,
      })
      return
    }

    if (serial.length > maxSerialNumberLength) {
      setErrorState({
        description: t('Unified.ManualSerial.CharCountError'),
        visible: true,
      })
      return
    }

    dispatch({ type: BCDispatchAction.UPDATE_SERIAL, payload: [serial] })
    navigation.navigate(BCSCScreens.EnterBirthdate)
  }, [serial, t, dispatch, navigation])

  return (
    <KeyboardView>
      <View style={styles.screenContainer}>
        <View style={styles.contentContainer}>
          <Image source={{ uri: SERIAL_HIGHLIGHT_IMAGE }} style={styles.image} resizeMode={'contain'} />
          <LimitedTextInput
            defaultValue={serial}
            label={t('Unified.ManualSerial.InputLabel')}
            limit={maxSerialNumberLength}
            handleChangeText={handleChangeText}
            accessibilityLabel={t('Unified.ManualSerial.InputLabel')}
            testID={testIdWithKey('SerialInput')}
            autoCapitalize={'characters'}
            autoCorrect={false}
            autoComplete={'off'}
            showLimitCounter={false}
          />
          {errorState.visible ? (
            <ThemedText variant={'labelSubtitle'} style={styles.error}>
              {errorState.description}
            </ThemedText>
          ) : null}
          <ThemedText style={{ marginBottom: Spacing.sm }}>{t('Unified.ManualSerial.InputSubText')}</ThemedText>
        </View>
        <View style={styles.controlsContainer}>
          <View style={styles.buttonContainer}>
            <Button
              title={t('Global.Continue')}
              buttonType={ButtonType.Primary}
              testID={testIdWithKey('Continue')}
              accessibilityLabel={t('Global.Continue')}
              onPress={onContinuePressed}
            />
          </View>
        </View>
      </View>
    </KeyboardView>
  )
}

export default ManualSerialScreen
