import { ActionScreenLayout } from '@/bcsc-theme/components/ActionScreenLayout'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'

interface AccountRenewalInformationScreenProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.AccountRenewalInformation>
}

export const AccountRenewalInformationScreen = ({ navigation }: AccountRenewalInformationScreenProps): JSX.Element => {
  const { t } = useTranslation()

  return (
    <ActionScreenLayout
      primaryActionText={t('BCSC.AccountRenewal.InformationPrimaryAction')}
      onPressPrimaryAction={() => {
        navigation.navigate(BCSCScreens.AccountRenewalFirstWarning)
      }}
    ></ActionScreenLayout>
  )
}
