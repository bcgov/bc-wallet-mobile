import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { useTheme } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import NotificationCard, { NotificationCardStatus } from './NotificationCard'

const CardRenewalNotification = () => {
  const { t } = useTranslation()
  const secureActions = useSecureActions()
  const { ColorPalette } = useTheme()

  return (
    <NotificationCard
      status={NotificationCardStatus.Unread}
      icon="information"
      iconColor={ColorPalette.brand.primary}
      iconStyle={{ marginRight: 12 }}
      title={t('Notification.CardStatusUpdated.Title')}
      description={t('Notification.CardStatusUpdated.Description')}
      buttonTitle={t('Notification.CardStatusUpdated.ButtonTitle')}
      onPress={() => secureActions.continueVerificationProcess()}
    />
  )
}

export default CardRenewalNotification
