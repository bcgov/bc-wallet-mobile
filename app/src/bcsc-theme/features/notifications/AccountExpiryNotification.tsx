import { useAccount } from '@/bcsc-theme/contexts/BCSCAccountContext'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { InfoBoxType } from '@bifold/core'
import moment from 'moment'
import { useTranslation } from 'react-i18next'
import NotificationCard from './NotificationCard'

const AccountExpiryNotification = () => {
  const { t } = useTranslation()
  const { account } = useAccount()
  const secureActions = useSecureActions()

  const expirationDate = account?.account_expiration_date
  const daysRemaining = expirationDate ? Math.ceil(moment(expirationDate).diff(moment(), 'days', true)) : 0

  return (
    <NotificationCard
      title={t('Notification.AccountExpiringSoon.Title', { days: daysRemaining })}
      description={t('Notification.AccountExpiringSoon.Description', {
        accountExpiration: expirationDate ? moment(expirationDate).format('LL') : '',
      })}
      buttonTitle={t('Notification.AccountExpiringSoon.ButtonTitle')}
      onPress={() => secureActions.continueVerificationProcess()}
      cardType={InfoBoxType.Warn}
    />
  )
}

export default AccountExpiryNotification
