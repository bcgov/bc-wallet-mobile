import { ActionScreenLayout } from '@/bcsc-theme/components/ActionScreenLayout'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'

interface AccountRenewalFinalWarningProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.AccountRenewalFinalWarning>
}

export const AccountRenewalFinalWarningScreen = ({ navigation }: AccountRenewalFinalWarningProps): JSX.Element => {
  const { t } = useTranslation()

  return (
    <ActionScreenLayout
      primaryActionText={t('BCSC.AccountRenewal.InformationPrimaryAction')}
      onPressPrimaryAction={() => {
        // TODO: navigate to setup steps
        // probably remove all state as well
      }}
    ></ActionScreenLayout>
  )
}
