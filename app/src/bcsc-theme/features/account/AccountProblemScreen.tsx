import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { RouteProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'

interface AccountProblemScreenProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.AccountProblem>
  route: RouteProp<BCSCMainStackParams, BCSCScreens.AccountProblem>
}

/**
 * Shown when Digital Services card creation is rejected because the BCSC account is suspended or
 * deactivated
 */
const AccountProblemScreen = ({ navigation, route }: AccountProblemScreenProps) => {
  const { title, description } = route.params
  const { Spacing } = useTheme()
  const { t } = useTranslation()

  const controls = (
    <ControlContainer>
      <Button
        title={t('BCSC.Settings.RemoveAccount')}
        accessibilityLabel={t('BCSC.Settings.RemoveAccount')}
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
    <ScreenWrapper
      controls={controls}
      padded={false}
      scrollViewContainerStyle={{ gap: Spacing.md, padding: Spacing.lg }}
    >
      <ThemedText variant={'headingThree'}>{title}</ThemedText>
      <ThemedText>{description}</ThemedText>
    </ScreenWrapper>
  )
}

export default AccountProblemScreen
