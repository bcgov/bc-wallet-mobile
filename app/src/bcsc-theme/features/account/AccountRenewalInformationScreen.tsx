import { ActionScreenLayout } from '@/bcsc-theme/components/ActionScreenLayout'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { ThemedText } from '@bifold/core'
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
    >
      <ThemedText variant="headingThree">{t('BCSC.AccountRenewal.InformationHeaderA')}</ThemedText>
      <ThemedText>{t('BCSC.AccountRenewal.InformationContentA')}</ThemedText>
      <ThemedText>{t('BCSC.AccountRenewal.InformationGetNewCardA')}</ThemedText>
      <ThemedText>{t('BCSC.AccountRenewal.InformationGetNewCardB')}</ThemedText>
      <ThemedText>{t('BCSC.AccountRenewal.InformationContentHeaderB')}</ThemedText>
      <ThemedText>{t('BCSC.AccountRenewal.InformationContentB')}</ThemedText>
      <ThemedText>{t('BCSC.AccountRenewal.InformationTypesOfAcceptedId')}</ThemedText>
      <ThemedText variant="headingThree">{t('BCSC.AccountRenewal.InformationHeaderB')}</ThemedText>
    </ActionScreenLayout>
  )
}
