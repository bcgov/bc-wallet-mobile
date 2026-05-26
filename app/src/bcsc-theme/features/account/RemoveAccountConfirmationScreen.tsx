import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import DeleteConfirmationScreen from '@/bcsc-theme/components/DeleteConfirmationScreen'
import React from 'react'
import { useTranslation } from 'react-i18next'

const RemoveAccountConfirmationScreen: React.FC = () => {
  const { t } = useTranslation()
  const factoryReset = useFactoryReset()

  const onConfirm = async () => {
    await factoryReset()
  }

  return (
    <DeleteConfirmationScreen
      title={t('BCSC.Account.RemoveAccountTitle')}
      description={t('BCSC.Account.RemoveAccountParagraph')}
      confirmLabel={t('BCSC.Account.RemoveAccount')}
      onConfirm={onConfirm}
    />
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
