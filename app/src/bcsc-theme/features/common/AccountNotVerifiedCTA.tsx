import { BCSCMainStackParams, BCSCScreens } from '@bcsc-theme/types/navigators'
import { Button, ButtonType, ScreenWrapper, ThemedText, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

const AccountNotVerifiedCTA: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()
  const { t } = useTranslation()
  const { Spacing } = useTheme()

  const controls = (
    <Button
      title={'Continue'}
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
      <ThemedText style={{ marginBottom: Spacing.lg }}>{t('BCSC.AccountNotVerified.Message')}</ThemedText>
      <ThemedText style={{ marginTop: Spacing.md, fontSize: 24, fontWeight: 'bold' }}>
        {t('BCSC.AccountNotVerified.Details.Title')}
      </ThemedText>
      {['Step1', 'Step2', 'Step3', 'Step4'].map((step) => (
        <View key={step} style={{ flexDirection: 'row', marginTop: Spacing.xs }}>
          <ThemedText>{'•  '}</ThemedText>
          <ThemedText style={{ flex: 1 }}>{t(`BCSC.AccountNotVerified.Details.${step}`)}</ThemedText>
        </View>
      ))}
    </ScreenWrapper>
  )
}

export default AccountNotVerifiedCTA
