import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import { ActionScreenLayout } from '@/bcsc-theme/components/ActionScreenLayout'
import { ThemedText, TOKENS, useServices } from '@bifold/core'
import { useTranslation } from 'react-i18next'

/**
 * Renders the Account Renewal Final Warning screen, informing users about the consequences of renewing their account.
 *
 * @returns {*} {JSX.Element} The AccountRenewalFinalWarningScreen component.
 */
export const AccountRenewalFinalWarningScreen = (): JSX.Element => {
  const { t } = useTranslation()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const factoryReset = useFactoryReset()

  return (
    <ActionScreenLayout
      primaryActionText={t('BCSC.AccountRenewal.WarningRenewButton')}
      onPressPrimaryAction={async () => {
        try {
          await factoryReset()
        } catch (error) {
          logger.error(
            'AccountRenewalFinalWarningScreen: Error during factory reset on account renewal',
            error as Error,
          )
        }
      }}
    >
      <ThemedText variant="headingThree">{t('BCSC.AccountRenewal.WarningHeader')}</ThemedText>
      <ThemedText variant="bold">{t('BCSC.AccountRenewal.WarningContentA')}</ThemedText>
      <ThemedText>{t('BCSC.AccountRenewal.WarningContentB')}</ThemedText>
    </ActionScreenLayout>
  )
}
