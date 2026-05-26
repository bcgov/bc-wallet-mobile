import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import StatusDetails from '@/bcsc-theme/components/StatusDetails'
import { BCSCMainStackParams, BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'

const TransferSuccessScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()
  const { t } = useTranslation()
  const { Spacing } = useTheme()

  const styles = StyleSheet.create({
    contentContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.lg,
    },
  })

  const controls = (
    <ControlContainer>
      <Button
        testID={testIdWithKey('TransferSuccessButton')}
        accessibilityLabel={t('BCSC.TransferSuccess.ButtonText')}
        title={t('BCSC.TransferSuccess.ButtonText')}
        buttonType={ButtonType.Primary}
        onPress={() => navigation.navigate(BCSCStacks.Tab, { screen: BCSCScreens.Home })}
      />
      <Button
        testID={testIdWithKey('RemoveAccountButton')}
        buttonType={ButtonType.Critical}
        title={t('BCSC.Account.RemoveAccount')}
        onPress={() => {
          navigation.navigate(BCSCScreens.MainRemoveAccountConfirmation)
        }}
      />
    </ControlContainer>
  )

  return (
    <ScreenWrapper padded={false} controls={controls} scrollViewContainerStyle={styles.contentContainer}>
      <StatusDetails
        title={t('BCSC.TransferSuccess.Title')}
        description={t('BCSC.TransferSuccess.Description')}
        description2={t('BCSC.TransferSuccess.ExtraText')}
      />
    </ScreenWrapper>
  )
}
export default TransferSuccessScreen
