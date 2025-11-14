import StatusDetails from '@/bcsc-theme/components/StatusDetails'
import { BCSCMainStackParams, BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'

const TransferSuccessScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()
  const { t } = useTranslation()
  return (
    <StatusDetails
      title={t('BCSC.TransferSuccess.Title')}
      description={t('BCSC.TransferSuccess.Description')}
      extraText={t('BCSC.TransferSuccess.ExtraText')}
      buttonText={t('BCSC.TransferSuccess.ButtonText')}
      onButtonPress={() => {
        navigation.navigate(BCSCStacks.Tab, { screen: BCSCScreens.Home })
      }}
    />
  )
}
export default TransferSuccessScreen
