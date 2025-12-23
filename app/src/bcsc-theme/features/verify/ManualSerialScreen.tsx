import {
  Button,
  ButtonType,
  LimitedTextInput,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  useStore,
  useTheme,
} from '@bifold/core'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Image, StyleSheet, useWindowDimensions } from 'react-native'

import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
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
  const [store] = useStore<BCState>()
  const { updateUserInfo } = useSecureActions()
  const [serial, setSerial] = useState(store.bcscSecure.serial ?? '')
  const { width } = useWindowDimensions()
  const [errorState, setErrorState] = useState<ErrorState>({
    visible: false,
    description: '',
  })

  const styles = StyleSheet.create({
    image: {
      width: width - Spacing.md * 6,
      height: (width - Spacing.md * 6) * twoThirds,
      padding: Spacing.lg,
      alignSelf: 'center',
      marginVertical: Spacing.lg,
    },
    error: {
      color: ColorPalette.semantic.error,
    },
  })

  const handleChangeText = useCallback((text: string) => {
    setSerial(text.replace(/\s/g, ''))
  }, [])

  const onContinuePressed = useCallback(async () => {
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

    await updateUserInfo({ serial })
    navigation.navigate(BCSCScreens.EnterBirthdate)
  }, [serial, t, navigation, updateUserInfo])

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
    <ScreenWrapper keyboardActive controls={controls} scrollViewContainerStyle={{ gap: Spacing.md }}>
      <ThemedText variant={'headingFour'}>{t('BCSC.ManualSerial.InputTitle')}</ThemedText>
      <ThemedText>{t('BCSC.ManualSerial.InputSubText')}</ThemedText>

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
      <Image source={{ uri: SERIAL_HIGHLIGHT_IMAGE }} style={styles.image} resizeMode={'contain'} />
    </ScreenWrapper>
  )
}

export default ManualSerialScreen
