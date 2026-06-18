import { useAccount } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { useTheme } from '@bifold/core'
import { CommonActions, useNavigation } from '@react-navigation/native'
import moment from 'moment'
import { useTranslation } from 'react-i18next'
import NotificationCard, { NotificationCardStatus } from './NotificationCard'

const CardExpiryNotification = () => {
  const { t } = useTranslation()
  const { account } = useAccount()
  const navigation = useNavigation()
  const { ColorPalette } = useTheme()

  const expirationDate = account?.account_expiration_date
  const daysRemaining = expirationDate ? Math.ceil(moment(expirationDate).diff(moment(), 'days', true)) : 0

  return (
    <NotificationCard
      status={NotificationCardStatus.Unread}
      icon="information"
      iconColor={ColorPalette.brand.primary}
      iconStyle={{ marginRight: 12 }}
      title={t('Notification.AccountExpiringSoon.Title', { days: daysRemaining })}
      description={t('Notification.AccountExpiringSoon.Description', {
        accountExpiration: expirationDate ? moment(expirationDate).format('LL') : '',
      })}
      buttonTitle={t('Notification.AccountExpiringSoon.ButtonTitle')}
      onPress={() => {
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: BCSCScreens.AccountExpired }] }))
      }}
    />
  )
}

export default CardExpiryNotification
