import BulletPoint from '@/bcsc-theme/components/BulletPoint'
import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { HighlightDivider } from '@/bcsc-theme/components/HighlightDivider'
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
    bulletPointContainer: {
      marginTop: Spacing.sm,
      marginLeft: Spacing.sm,
    },
    body: {
      marginTop: Spacing.md,
    },
    divider: {
      marginTop: Spacing.md,
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
    <ControlContainer>
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
    </ControlContainer>
  )

  return (
    <ScreenWrapper padded={false} keyboardActive controls={controls} scrollViewContainerStyle={{ padding: Spacing.lg }}>
      <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.md }}>
        {t('BCSC.NicknameAccount.EnterNickname')}
      </ThemedText>

      <InputWithValidation
        id={'accountNickname'}
        label={t('BCSC.NicknameAccount.AccountName')}
        hideLabel
        value={accountNickname}
        onChangeText={handleChangeText}
        error={error}
        onErrorClear={() => setError(null)}
        textInputProps={{
          maxLength: formStringLengths.maximumLength,
          autoCorrect: false,
          autoCapitalize: 'sentences',
        }}
      />

      {error ? null : <HighlightDivider style={styles.divider} />}

      <ThemedText style={styles.body}>
        {isRenaming ? t('BCSC.NicknameAccount.EditAccountName') : t('BCSC.NicknameAccount.CreateAccountName')}
      </ThemedText>

      <View style={styles.bulletPointContainer}>
        <BulletPoint pointsText={t('BCSC.NicknameAccount.AccountNameDescription1')} />
        <BulletPoint pointsText={t('BCSC.NicknameAccount.AccountNameDescription2')} />
      </View>
    </ScreenWrapper>
  )
}

export default NicknameForm
