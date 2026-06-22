import { useAccount } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import NotificationCard, { NotificationCardStatus } from './NotificationCard'

const CardRenewalNotification = () => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const { ColorPalette } = useTheme()
  const { account } = useAccount()
  const cardExpiry = account?.card_expiry
  return (
    <NotificationCard
      status={NotificationCardStatus.Unread}
      icon="information"
      iconColor={ColorPalette.brand.primary}
      iconStyle={{ marginRight: 12 }}
      title={t('Notification.CardStatusUpdated.Title')}
      description={t('Notification.CardStatusUpdated.Description', { expiryDate: cardExpiry })}
      buttonTitle={t('Notification.CardStatusUpdated.ButtonTitle')}
      onPress={() => navigation.navigate(BCSCScreens.ReverifyAccount, { isExpired: false })}
    />
  )
}

export default CardRenewalNotification
