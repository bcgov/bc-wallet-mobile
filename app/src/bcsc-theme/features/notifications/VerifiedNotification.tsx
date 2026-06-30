import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import NotificationCard, { NotificationCardStatus } from './NotificationCard'

const VerifiedNotification = () => {
  const { t } = useTranslation()
  const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()

  return (
    <NotificationCard
      title={t('Notification.Verified.Title')}
      description={t('Notification.Verified.Description')}
      buttonTitle={t('Notification.Verified.ButtonTitle')}
      icon="check-circle"
      status={NotificationCardStatus.Unread}
      onPress={() => navigation.navigate(BCSCScreens.VerificationSuccess)}
    />
  )
}

export default VerifiedNotification
