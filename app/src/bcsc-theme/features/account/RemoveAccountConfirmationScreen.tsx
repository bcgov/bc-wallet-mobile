import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import DestructiveConfirmationScreen from '@/bcsc-theme/components/DestructiveConfirmationScreen'
import { ThemedText } from '@bifold/core'
import React from 'react'
import { useTranslation } from 'react-i18next'

const RemoveAccountConfirmationScreen: React.FC = () => {
  const { t } = useTranslation()
  const factoryReset = useFactoryReset()

  const action = async () => {
    const result = await factoryReset()
    if (!result.success) {
      throw result.error ?? new Error('Factory reset failed')
    }
  }

  return (
    <DestructiveConfirmationScreen
      title={t('BCSC.Account.RemoveAccountTitle')}
      confirmLabel={t('BCSC.Account.RemoveAccount')}
      loadingLabel={t('BCSC.Account.RemoveAccountLoading')}
      logScope={'RemoveAccount'}
      action={action}
    >
      <ThemedText>{t('BCSC.Account.RemoveAccountParagraph')}</ThemedText>
    </DestructiveConfirmationScreen>
  )
}

export const MainRemoveAccountConfirmationScreen = () => {
  return <RemoveAccountConfirmationScreen />
}

export const VerifyRemoveAccountConfirmationScreen = () => {
  return <RemoveAccountConfirmationScreen />
}

export const OnboardingRemoveAccountConfirmationScreen = () => {
  return <RemoveAccountConfirmationScreen />
}

export default RemoveAccountConfirmationScreen
