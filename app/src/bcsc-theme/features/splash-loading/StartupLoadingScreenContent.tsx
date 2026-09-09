import { WaitingScreenContent } from '@/bcsc-theme/components/WaitingScreenContent'
import { testIdWithKey } from '@bifold/core'
import { useTranslation } from 'react-i18next'

export const StartupLoadingScreenContent = ({
  message,
  statusMessage,
}: {
  message?: string
  statusMessage?: string
}) => {
  const { t } = useTranslation()

  return (
    <WaitingScreenContent
      message={message ?? t('BCSC.Loading.AppStartup')}
      statusMessage={statusMessage ?? t('Init.Starting')}
      progressPercent={(2 / 3) * 100}
      testID={testIdWithKey('StartupLoadingScreenContent')}
    />
  )
}
