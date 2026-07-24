import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { BCSCScreens, BCSCMainStackParams } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'

interface AccountProblemScreenProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.MainPersonCredentialAccountProblem>
}

/**
 * Shown when Person Credential creation is rejected because the BCSC account is suspended or
 * deactivated (#3389). Suspend/deactivate has no push notification or ID token signal — this is
 * the only place the state surfaces, so the user needs an explicit path to recover (remove and
 * re-add the account).
 */
const AccountProblemScreen = ({ navigation }: AccountProblemScreenProps) => {
  const { Spacing } = useTheme()
  const { t } = useTranslation()

  const controls = (
    <ControlContainer>
      <Button
        title={t('Alerts.PersonCredentialAccountProblem.Action1')}
        accessibilityLabel={t('Alerts.PersonCredentialAccountProblem.Action1')}
        testID={testIdWithKey('RemoveAccount')}
        buttonType={ButtonType.Critical}
        onPress={() => navigation.navigate(BCSCScreens.MainRemoveAccountConfirmation)}
      />
      <Button
        title={t('Global.Close')}
        accessibilityLabel={t('Global.Close')}
        testID={testIdWithKey('Close')}
        buttonType={ButtonType.Secondary}
        onPress={() => navigation.goBack()}
      />
    </ControlContainer>
  )

  return (
    <ScreenWrapper controls={controls} padded={false} scrollViewContainerStyle={{ gap: Spacing.md, padding: Spacing.lg }}>
      <ThemedText variant={'headingThree'}>{t('Alerts.PersonCredentialAccountProblem.Title')}</ThemedText>
      <ThemedText>{t('Alerts.PersonCredentialAccountProblem.Description')}</ThemedText>
    </ScreenWrapper>
  )
}

export default AccountProblemScreen
