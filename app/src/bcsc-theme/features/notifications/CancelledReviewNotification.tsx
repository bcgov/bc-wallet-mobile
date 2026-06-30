import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import { useStore } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import NotificationCard, { NotificationCardStatus } from './NotificationCard'

const CancelledReviewNotification = () => {
  const { t } = useTranslation()
  const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()
  const [store] = useStore<BCState>()
  const agentReason = store.bcscSecure.verificationRequestStatusMessage

  return (
    <NotificationCard
      title={t('Notification.CancelledReview.Title')}
      description={t('Notification.CancelledReview.Description')}
      buttonTitle={t('Notification.CancelledReview.ButtonTitle')}
      icon="alert-circle"
      status={NotificationCardStatus.Unread}
      onPress={() => navigation.navigate(BCSCScreens.CancelledReview, { agentReason })}
    />
  )
}

export default CancelledReviewNotification
