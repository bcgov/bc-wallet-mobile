import { ActionScreenLayout } from '@/bcsc-theme/components/ActionScreenLayout'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { ThemedText } from '@bifold/core'
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
    >
      <ThemedText variant="headingThree">{t('BCSC.AccountRenewal.InformationHeaderA')}</ThemedText>
      <ThemedText>{t('BCSC.AccountRenewal.InformationContentA')}</ThemedText>
      <ThemedText>{t('BCSC.AccountRenewal.InformationGetNewCardA')}</ThemedText>
      <ThemedText>{t('BCSC.AccountRenewal.InformationGetNewCardB')}</ThemedText>
      <ThemedText>{t('BCSC.AccountRenewal.InformationContentHeaderB')}</ThemedText>
      <ThemedText variant="headingThree">{t('BCSC.AccountRenewal.InformationHeaderB')}</ThemedText>
    </ActionScreenLayout>
  )
}
