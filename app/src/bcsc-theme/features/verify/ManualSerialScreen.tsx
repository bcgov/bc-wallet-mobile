import { Button, ButtonType, LimitedTextInput, testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Image, StyleSheet, useWindowDimensions } from 'react-native'

import ScreenWrapper from '@/bcsc-theme/components/ScreenWrapper'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, BCState } from '@/store'
import SerialHighlightImage from '@assets/img/highlight_serial_barcode.png'
import { StackNavigationProp } from '@react-navigation/stack'

const SERIAL_HIGHLIGHT_IMAGE = Image.resolveAssetSource(SerialHighlightImage).uri

const twoThirds = 0.67
const maxSerialNumberLength = 15

type ErrorState = {
  visible: boolean
  description: string
}

type ManualSerialScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.ManualSerial>
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
    image: {
      width: width - Spacing.md * 2,
      height: (width - Spacing.md * 2) * twoThirds,
      marginBottom: Spacing.md,
    },
    error: {
      color: ColorPalette.semantic.error,
      marginBottom: Spacing.sm,
    },
  })

  const handleChangeText = useCallback((text: string) => {
    setSerial(text.replace(/\s/g, ''))
  }, [])

  const onContinuePressed = useCallback(() => {
    if (serial.length < 1) {
      setErrorState({
        description: t('BCSC.ManualSerial.EmptySerialError'),
        visible: true,
      })
      return
    }

    if (serial.length > maxSerialNumberLength) {
      setErrorState({
        description: t('BCSC.ManualSerial.CharCountError'),
        visible: true,
      })
      return
    }

    dispatch({ type: BCDispatchAction.UPDATE_SERIAL, payload: [serial] })
    navigation.navigate(BCSCScreens.EnterBirthdate)
  }, [serial, t, dispatch, navigation])

  const controls = (
    <Button
      title={t('Global.Continue')}
      buttonType={ButtonType.Primary}
      testID={testIdWithKey('Continue')}
      accessibilityLabel={t('Global.Continue')}
      onPress={onContinuePressed}
    />
  )

  return (
    <ScreenWrapper keyboardActive controls={controls}>
      <Image source={{ uri: SERIAL_HIGHLIGHT_IMAGE }} style={styles.image} resizeMode={'contain'} />
      <LimitedTextInput
        defaultValue={serial}
        label={t('BCSC.ManualSerial.InputLabel')}
        limit={maxSerialNumberLength}
        handleChangeText={handleChangeText}
        accessibilityLabel={t('BCSC.ManualSerial.InputLabel')}
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
      <ThemedText style={{ marginBottom: Spacing.sm }}>{t('BCSC.ManualSerial.InputSubText')}</ThemedText>
    </ScreenWrapper>
  )
}

export default ManualSerialScreen
