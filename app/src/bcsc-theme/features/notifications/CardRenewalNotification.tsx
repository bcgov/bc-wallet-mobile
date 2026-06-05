import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { InfoBoxType } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import NotificationCard from './NotificationCard'

const CardRenewalNotification = () => {
  const { t } = useTranslation()
  const secureActions = useSecureActions()

  return (
    <NotificationCard
      title={t('Notification.CardStatusUpdated.Title')}
      description={t('Notification.CardStatusUpdated.Description')}
      buttonTitle={t('Notification.CardStatusUpdated.ButtonTitle')}
      onPress={() => secureActions.continueVerificationProcess()}
      cardType={InfoBoxType.Info}
    />
  )
}

export default CardRenewalNotification
