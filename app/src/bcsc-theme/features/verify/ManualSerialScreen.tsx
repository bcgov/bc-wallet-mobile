import { InputWithValidation } from '@/bcsc-theme/components/InputWithValidation'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import SerialHighlightImage from '@assets/img/highlight_serial_barcode.png'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Image, StyleSheet, useWindowDimensions } from 'react-native'

const SERIAL_HIGHLIGHT_IMAGE = Image.resolveAssetSource(SerialHighlightImage).uri

const twoThirds = 0.67
const maxSerialNumberLength = 15

type ManualSerialScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.ManualSerial>
}

const ManualSerialScreen: React.FC<ManualSerialScreenProps> = ({ navigation }: ManualSerialScreenProps) => {
  const { t } = useTranslation()
  const { Spacing } = useTheme()
  const [store] = useStore<BCState>()
  const { updateUserInfo } = useSecureActions()
  const [serial, setSerial] = useState(store.bcscSecure.serial ?? '')
  const { width } = useWindowDimensions()
  const [error, setError] = useState<string | null>(null)

  const styles = StyleSheet.create({
    image: {
      width: width - Spacing.md * 6,
      height: (width - Spacing.md * 6) * twoThirds,
      padding: Spacing.lg,
      alignSelf: 'center',
      marginVertical: Spacing.lg,
    },
  })

  const handleChangeText = useCallback((text: string) => {
    setSerial(text.replace(/\s/g, ''))
  }, [])

  const onContinuePressed = useCallback(async () => {
    if (serial.length < 1) {
      setError(t('BCSC.ManualSerial.EmptySerialError'))
      return
    }

    if (serial.length > maxSerialNumberLength) {
      setError(t('BCSC.ManualSerial.CharCountError'))
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
      <ThemedText variant={'headingThree'}>{t('BCSC.ManualSerial.InputTitle')}</ThemedText>
      <ThemedText>{t('BCSC.ManualSerial.InputSubText')}</ThemedText>

      <InputWithValidation
        id={'serial'}
        label={t('BCSC.ManualSerial.InputLabel')}
        value={serial}
        onChangeText={handleChangeText}
        error={error}
        onErrorClear={() => setError(null)}
        textInputProps={{
          maxLength: maxSerialNumberLength,
          autoCapitalize: 'characters',
          autoCorrect: false,
          autoComplete: 'off',
        }}
      />
      <Image source={{ uri: SERIAL_HIGHLIGHT_IMAGE }} style={styles.image} resizeMode={'contain'} />
    </ScreenWrapper>
  )
}

export default ManualSerialScreen
