import { BCSCMainStackParams, BCSCScreens } from '@bcsc-theme/types/navigators'
import { Button, ButtonType, ScreenWrapper, ThemedText, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'

const AccountNotVerifiedCTA: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()
  const { t } = useTranslation()
  const { Spacing } = useTheme()

  const controls = (
    <Button
      title={t('Global.ContinueSetup')}
      buttonType={ButtonType.Primary}
      accessibilityLabel={t('Global.ContinueSetup')}
      onPress={() => navigation.navigate(BCSCScreens.SetupSteps)}
    />
  )

  return (
    <ScreenWrapper controls={controls}>
      <ThemedText variant="headingThree" style={{ marginBottom: Spacing.md }}>
        {t('BCSC.AccountNotVerified.Title')}
      </ThemedText>
      <ThemedText>{t('BCSC.AccountNotVerified.Message')}</ThemedText>
    </ScreenWrapper>
  )
}

export default AccountNotVerifiedCTA
