import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { InputWithValidation } from '@/bcsc-theme/components/InputWithValidation'
import useFocusFirstInvalidField from '@/bcsc-theme/hooks/useFocusFirstInvalidField'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { firstErrorKey, serialSchema } from '@/bcsc-theme/utils/validation'
import { BCState } from '@/store'
import { TestIds } from '@/test-ids/registry'
import SerialHighlightImage from '@assets/img/highlight_serial_barcode.png'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Image } from 'react-native'

const SERIAL_HIGHLIGHT_IMAGE = Image.resolveAssetSource(SerialHighlightImage).uri

const maxSerialNumberLength = 15
const FIELD_ORDER = ['serial'] as const

type ManualSerialScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.ManualSerial>
}

const ManualSerialScreen: React.FC<ManualSerialScreenProps> = ({ navigation }: ManualSerialScreenProps) => {
  const { t } = useTranslation()
  const { Spacing } = useTheme()
  const [store] = useStore<BCState>()
  const { updateUserInfo } = useSecureActions()
  const [serial, setSerial] = useState(store.bcscSecure.serial ?? '')
  const [error, setError] = useState<string | null>(null)
  const { scrollViewRef, inputRefs, onFieldLayout, focusFirstInvalidField } = useFocusFirstInvalidField(FIELD_ORDER)

  const handleChangeText = useCallback((text: string) => {
    setSerial(text.replace(/\s/g, ''))
  }, [])

  const onContinuePressed = useCallback(async () => {
    const errorKey = firstErrorKey(serialSchema, serial)

    if (errorKey) {
      const message = t(errorKey)
      setError(message)
      focusFirstInvalidField({ serial: message })
      return
    }

    await updateUserInfo({ serial })
    navigation.navigate(BCSCScreens.EnterBirthdate)
  }, [serial, t, navigation, updateUserInfo, focusFirstInvalidField])

  const controls = (
    <ControlContainer>
      <Button
        title={t('Global.Continue')}
        buttonType={ButtonType.Primary}
        testID={testIdWithKey(TestIds.verify.manualSerial.continue)}
        accessibilityLabel={t('Global.Continue')}
        onPress={onContinuePressed}
      />
    </ControlContainer>
  )

  return (
    <ScreenWrapper
      padded={false}
      keyboardActive
      controls={controls}
      scrollViewRef={scrollViewRef}
      scrollViewContainerStyle={{ gap: Spacing.md, padding: Spacing.lg }}
    >
      <ThemedText variant={'headingThree'}>{t('BCSC.ManualSerial.InputTitle')}</ThemedText>
      <ThemedText>{t('BCSC.ManualSerial.InputSubText')}</ThemedText>

      <InputWithValidation
        ref={inputRefs.serial}
        id={'serial'}
        label={t('BCSC.ManualSerial.InputLabel')}
        value={serial}
        onChangeText={handleChangeText}
        error={error}
        onErrorClear={() => setError(null)}
        onLayout={onFieldLayout('serial')}
        textInputProps={{
          maxLength: maxSerialNumberLength,
          autoCapitalize: 'characters',
          autoCorrect: false,
          autoComplete: 'off',
        }}
      />
      <Image
        source={{ uri: SERIAL_HIGHLIGHT_IMAGE }}
        style={{ flexGrow: 1, width: '100%', aspectRatio: 1.6 }}
        resizeMode={'contain'}
      />
    </ScreenWrapper>
  )
}

export default ManualSerialScreen
