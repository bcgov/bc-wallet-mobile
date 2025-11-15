import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import { ActionScreenLayout } from '@/bcsc-theme/components/ActionScreenLayout'
import { BCDispatchAction, BCState } from '@/store'
import { ThemedText, useStore } from '@bifold/core'
import { useTranslation } from 'react-i18next'

export const AccountRenewalFinalWarningScreen = (): JSX.Element => {
  const { t } = useTranslation()
  const [, dispatch] = useStore<BCState>()
  const factoryReset = useFactoryReset()

  return (
    <ActionScreenLayout
      primaryActionText={t('BCSC.AccountRenewal.WarningRenewButton')}
      onPressPrimaryAction={async () => {
        await factoryReset()
        dispatch({ type: BCDispatchAction.UPDATE_COMPLETED_ONBOARDING, payload: [true] })
      }}
    >
      <ThemedText variant="headingThree">{t('BCSC.AccountRenewal.WarningHeader')}</ThemedText>
      <ThemedText variant="bold">{t('BCSC.AccountRenewal.WarningContentA')}</ThemedText>
      <ThemedText>{t('BCSC.AccountRenewal.WarningContentB')}</ThemedText>
    </ActionScreenLayout>
  )
}
