import { ActionScreenLayout } from '@/bcsc-theme/components/ActionScreenLayout'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { ThemedText } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'

interface AccountRenewalFirstWarningProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.AccountRenewalInformation>
}

/**
 * Renders the Account Renewal First Warning screen, alerting users about the impending expiration of their account.
 *
 * @returns {*} {React.ReactElement} The AccountRenewalFirstWarningScreen component.
 */
export const AccountRenewalFirstWarningScreen = ({
  navigation,
}: AccountRenewalFirstWarningProps): React.ReactElement => {
  const { t } = useTranslation()

  return (
    <ActionScreenLayout
      primaryActionText={t('Global.Continue')}
      onPressPrimaryAction={() => {
        navigation.navigate(BCSCScreens.AccountRenewalFinalWarning)
      }}
    >
      <ThemedText variant="headingThree">{t('BCSC.AccountRenewal.RenewalTimeHeader')}</ThemedText>
      <ThemedText>{t('BCSC.AccountRenewal.RenewalTimeContentA')}</ThemedText>
      <ThemedText variant="bold">{t('BCSC.AccountRenewal.RenewalTimeContentB')}</ThemedText>
      <ThemedText>{t('BCSC.AccountRenewal.RenewalTimeContentC')}</ThemedText>
    </ActionScreenLayout>
  )
}
