import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { ACCOUNT_EXPIRATION_DATE_FORMAT } from '@/constants'
import { useTheme } from '@bifold/core'
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native'
import moment from 'moment'
import { useTranslation } from 'react-i18next'
import NotificationActionCard from './NotificationActionCard'

interface CardRenewalNotificationProps {
  expiresAt: Date
}

const CardRenewalNotification = ({ expiresAt }: CardRenewalNotificationProps) => {
  const { t } = useTranslation()
  const navigation = useNavigation<NavigationProp<ParamListBase>>()
  const { ColorPalette } = useTheme()
  return (
    <NotificationActionCard
      icon="information"
      iconColor={ColorPalette.brand.primary}
      hideIconCircle={true}
      title={t('Notification.AccountRenewal.Title')}
      description={t('Notification.AccountRenewal.Description', {
        expiryDate: moment(expiresAt).format(ACCOUNT_EXPIRATION_DATE_FORMAT),
      })}
      buttonTitle={t('Notification.AccountRenewal.ButtonTitle')}
      onPress={() => navigation.navigate(BCSCScreens.ReverifyAccount, { isExpired: false })}
    />
  )
}

export default CardRenewalNotification
