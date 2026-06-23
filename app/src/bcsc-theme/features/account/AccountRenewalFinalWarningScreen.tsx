import { ActionScreenLayout } from '@/bcsc-theme/components/ActionScreenLayout'
import { useSecureActions } from '@/bcsc-theme/hooks/useSecureActions'
import { useVerificationReset } from '@/bcsc-theme/hooks/useVerificationReset'
import { ThemedText, TOKENS, useServices } from '@bifold/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Renders the Account Renewal Final Warning screen, informing users about the consequences of renewing their account.
 *
 * @returns {*} {React.ReactElement} The AccountRenewalFinalWarningScreen component.
 */
export const AccountRenewalFinalWarningScreen = (): React.ReactElement => {
  const { t } = useTranslation()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const verificationReset = useVerificationReset()
  const { continueVerificationProcess } = useSecureActions()
  const [isLoading, setIsLoading] = useState(false)

  return (
    <ActionScreenLayout
      primaryActionText={t('BCSC.AccountRenewal.WarningRenewButton')}
      isPrimaryActionLoading={isLoading}
      onPressPrimaryAction={async () => {
        try {
          setIsLoading(true)
          const success = await verificationReset()
          if (success) {
            continueVerificationProcess()
          }
        } catch (error) {
          logger.error(
            'AccountRenewalFinalWarningScreen: Error during factory reset on account renewal',
            error as Error
          )
        } finally {
          setIsLoading(false)
        }
      }}
    >
      <ThemedText variant="headingThree">{t('BCSC.AccountRenewal.WarningHeader')}</ThemedText>
      <ThemedText variant="bold">{t('BCSC.AccountRenewal.WarningContentA')}</ThemedText>
      <ThemedText>{t('BCSC.AccountRenewal.WarningContentB')}</ThemedText>
    </ActionScreenLayout>
  )
}
