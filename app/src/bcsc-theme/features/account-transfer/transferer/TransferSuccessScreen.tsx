import StatusDetails from '@/bcsc-theme/components/StatusDetails'
import { useRemoveAccountAlert } from '@/bcsc-theme/hooks/useRemoveAccountAlert'
import { BCSCMainStackParams, BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, ScreenWrapper, testIdWithKey } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'

const TransferSuccessScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()
  const { t } = useTranslation()
  const showRemoveAccountAlert = useRemoveAccountAlert()

  const styles = StyleSheet.create({
    contentContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
  })

  const controls = (
    <>
      <Button
        testID={testIdWithKey(t('BCSC.TransferSuccess.ButtonText'))}
        accessibilityLabel={t('BCSC.TransferSuccess.ButtonText')}
        title={t('BCSC.TransferSuccess.ButtonText')}
        buttonType={ButtonType.Primary}
        onPress={() => navigation.navigate(BCSCStacks.Tab, { screen: BCSCScreens.Home })}
      />
      <Button
        testID={testIdWithKey(t('BCSC.Account.RemoveAccount'))}
        buttonType={ButtonType.Critical}
        title={t('BCSC.Account.RemoveAccount')}
        onPress={showRemoveAccountAlert}
      />
    </>
  )

  return (
    <ScreenWrapper controls={controls} scrollViewContainerStyle={styles.contentContainer}>
      <StatusDetails
        title={t('BCSC.TransferSuccess.Title')}
        description={t('BCSC.TransferSuccess.Description')}
        extraText={t('BCSC.TransferSuccess.ExtraText')}
      />
    </ScreenWrapper>
  )
}
export default TransferSuccessScreen
