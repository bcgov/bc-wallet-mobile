import StatusDetails from '@/bcsc-theme/components/StatusDetails'
import { BCSCScreens, BCSCTabStackParams } from '@/bcsc-theme/types/navigators'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'

const TransferSuccessScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<BCSCTabStackParams>>()
  const { t } = useTranslation()
  return (
    <StatusDetails
      title={t('Unified.TransferSuccess.Title')}
      description={t('Unified.TransferSuccess.Description')}
      extraText={t('Unified.TransferSuccess.ExtraText')}
      buttonText={t('Unified.TransferSuccess.ButtonText')}
      onButtonPress={() => {
        navigation.navigate(BCSCScreens.Home)
      }}
    />
  )
}
export default TransferSuccessScreen
