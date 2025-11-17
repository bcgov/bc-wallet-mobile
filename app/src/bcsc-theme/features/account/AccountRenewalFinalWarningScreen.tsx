import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import { ActionScreenLayout } from '@/bcsc-theme/components/ActionScreenLayout'
import { BCDispatchAction, BCState } from '@/store'
import { ThemedText, useStore } from '@bifold/core'
import { useTranslation } from 'react-i18next'

/**
 * Renders the Account Renewal Final Warning screen, informing users about the consequences of renewing their account.
 *
 * @returns {*} {JSX.Element} The AccountRenewalFinalWarningScreen component.
 */
export const AccountRenewalFinalWarningScreen = (): JSX.Element => {
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const factoryReset = useFactoryReset()

  return (
    <ActionScreenLayout
      primaryActionText={t('BCSC.AccountRenewal.WarningRenewButton')}
      onPressPrimaryAction={async () => {
        await factoryReset({
          // QUESTION (MD): What other state should we keep?
          completedNewSetup: true,
          completedOnboarding: true,
          nicknames: store.bcsc.nicknames,
          selectedNickname: store.bcsc.selectedNickname,
        })
        dispatch({ type: BCDispatchAction.UPDATE_COMPLETED_ONBOARDING, payload: [true] })
      }}
    >
      <ThemedText variant="headingThree">{t('BCSC.AccountRenewal.WarningHeader')}</ThemedText>
      <ThemedText variant="bold">{t('BCSC.AccountRenewal.WarningContentA')}</ThemedText>
      <ThemedText>{t('BCSC.AccountRenewal.WarningContentB')}</ThemedText>
    </ActionScreenLayout>
  )
}
