import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import BulletPoint from '@/bcsc-theme/components/BulletPoint'
import { formStringLengths } from '@/constants'
import { LimitedTextInput, testIdWithKey, ThemedText, useTheme } from '@bifold/core'

interface NicknameFormProps {
  accountNickname: string
  onChangeText: (text: string) => void
  error?: string | null
  isRenaming?: boolean
}

const NicknameForm: React.FC<NicknameFormProps> = ({ accountNickname, onChangeText, error, isRenaming }) => {
  const { t } = useTranslation()
  const { Spacing } = useTheme()

  const styles = StyleSheet.create({
    contentContainer: {
      flexGrow: 1,
      paddingBottom: Spacing.sm,
    },
    bulletPointContainer: {
      margin: Spacing.sm,
    },
  })

  return (
    <View style={styles.contentContainer}>
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
        value={accountNickname}
        label={t('BCSC.NicknameAccount.AccountName')}
        limit={formStringLengths.maximumLength}
        handleChangeText={onChangeText}
        accessibilityLabel={t('BCSC.NicknameAccount.AccountName')}
        testID={testIdWithKey('NameInput')}
      />
      {error && <ThemedText variant={'inlineErrorText'}>{error}</ThemedText>}
    </View>
  )
}

export default NicknameForm
