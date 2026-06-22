import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { useTheme } from '@bifold/core'
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import NotificationCard, { NotificationCardStatus } from './NotificationCard'

const CardExpiryNotification = () => {
  const { t } = useTranslation()
  const navigation = useNavigation<NavigationProp<ParamListBase>>()
  const { ColorPalette } = useTheme()

  return (
    <NotificationCard
      status={NotificationCardStatus.Unread}
      icon="information"
      iconColor={ColorPalette.brand.primary}
      iconStyle={{ marginRight: 12 }}
      title={t('Notification.AccountExpired.Title')}
      description={t('Notification.AccountExpired.Description')}
      buttonTitle={t('Notification.AccountExpired.ButtonTitle')}
      onPress={() => {
        navigation.navigate(BCSCScreens.ReverifyAccount, { isExpired: true })
      }}
    />
  )
}

export default CardExpiryNotification
