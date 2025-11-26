import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import BulletPoint from '@/bcsc-theme/components/BulletPoint'
import ScreenWrapper from '@/bcsc-theme/components/ScreenWrapper'
import { formStringLengths } from '@/constants'
import { BCState } from '@/store'
import {
  Button,
  ButtonType,
  LimitedTextInput,
  testIdWithKey,
  ThemedText,
  useAnimatedComponents,
  useStore,
  useTheme,
} from '@bifold/core'
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
      accessibilityLabel={t('BCSC.NicknameAccount.SaveAndContinue')}
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

      <LimitedTextInput
        showLimitCounter={false}
        defaultValue={accountNickname}
        label={t('BCSC.NicknameAccount.AccountName')}
        limit={formStringLengths.maximumLength}
        handleChangeText={handleChangeText}
        accessibilityLabel={t('BCSC.NicknameAccount.AccountName')}
        testID={testIdWithKey('NameInput')}
      />
      {error && <ThemedText variant={'inlineErrorText'}>{error}</ThemedText>}
    </ScreenWrapper>
  )
}

export default NicknameForm
