import BulletPoint from '@/bcsc-theme/components/BulletPoint'
import { InputWithValidation } from '@/bcsc-theme/components/InputWithValidation'
import { formStringLengths } from '@/constants'
import { BCState } from '@/store'
import {
  Button,
  ButtonType,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  useAnimatedComponents,
  useStore,
  useTheme,
} from '@bifold/core'
import { a11yLabel } from '@utils/accessibility'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { getNicknameValidationErrorKey } from '../../../utils/account-utils'

interface NicknameFormProps {
  onSubmit: (trimmedNickname: string) => Promise<void> | void
  isRenaming?: boolean
}

const NicknameForm: React.FC<NicknameFormProps> = ({ onSubmit, isRenaming }) => {
  const { t } = useTranslation()
  const { Spacing } = useTheme()
  const { ButtonLoading } = useAnimatedComponents()
  const [store] = useStore<BCState>()
  const [accountNickname, setAccountNickname] = useState(store.bcsc.selectedNickname ?? '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const styles = StyleSheet.create({
    contentContainer: {
      flexGrow: 1,
      paddingBottom: Spacing.sm,
    },
    bulletPointContainer: {
      margin: Spacing.sm,
    },
  })

  const handleChangeText = useCallback((text: string) => {
    setAccountNickname(text)
  }, [])

  const handleButtonPress = useCallback(async () => {
    const trimmedAccountNickname = accountNickname.trim()
    const validationErrorKey = getNicknameValidationErrorKey(store, trimmedAccountNickname)

    if (validationErrorKey) {
      setError(t(validationErrorKey))
      return
    }

    setError(null)
    setLoading(true)

    try {
      await onSubmit(trimmedAccountNickname)
    } finally {
      setLoading(false)
    }
  }, [accountNickname, onSubmit, store, t])

  const controls = (
    <Button
      title={t('BCSC.NicknameAccount.SaveAndContinue')}
      buttonType={ButtonType.Primary}
      testID={testIdWithKey('SaveAndContinue')}
      accessibilityLabel={a11yLabel(t('BCSC.NicknameAccount.SaveAndContinue'))}
      onPress={handleButtonPress}
      disabled={loading}
    >
      {loading && <ButtonLoading />}
    </Button>
  )

  return (
    <ScreenWrapper keyboardActive controls={controls}>
      <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.md }}>
        {t('BCSC.NicknameAccount.AccountName')}
      </ThemedText>

      <ThemedText>
        {isRenaming ? t('BCSC.NicknameAccount.EditAccountName') : t('BCSC.NicknameAccount.CreateAccountName')}
      </ThemedText>

      <View style={styles.bulletPointContainer}>
        <BulletPoint pointsText={t('BCSC.NicknameAccount.AccountNameDescription1')} />
        <BulletPoint pointsText={t('BCSC.NicknameAccount.AccountNameDescription2')} />
      </View>

      <InputWithValidation
        id={'accountNickname'}
        label={t('BCSC.NicknameAccount.AccountName')}
        value={accountNickname}
        onChangeText={handleChangeText}
        error={error}
        onErrorClear={() => setError(null)}
        textInputProps={{
          maxLength: formStringLengths.maximumLength,
          autoCorrect: false,
        }}
      />
    </ScreenWrapper>
  )
}

export default NicknameForm
