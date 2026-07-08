import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import { useStore, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import NotificationActionCard from './NotificationActionCard'

const CancelledReviewNotification = () => {
  const { ColorPalette } = useTheme()
  const { t } = useTranslation()
  const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()
  const [store] = useStore<BCState>()
  const agentReason = store.bcscSecure.verificationRequestStatusMessage

  return (
    <NotificationActionCard
      title={t('Notification.CancelledReview.Title')}
      description={t('Notification.CancelledReview.Description')}
      buttonTitle={t('Notification.CancelledReview.ButtonTitle')}
      icon="information"
      hideIconCircle={true}
      iconColor={ColorPalette.brand.primary}
      onPress={() => navigation.navigate(BCSCScreens.CancelledReview, { agentReason })}
    />
  )
}

export default CancelledReviewNotification
