import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { SystemModal } from '../../modal/components/SystemModal'
import useCancelledReviewViewModel from './CancelledReviewViewModel'

interface CancelledReviewProps {
  route: {
    params: {
      agentReason?: string
    }
  }
}
const CancelledReview = ({ route }: CancelledReviewProps) => {
  const { agentReason } = route.params
  const { t } = useTranslation()
  const navigation = useNavigation<StackNavigationProp<BCSCVerifyStackParams>>()
  const { cleanUpVerificationData } = useCancelledReviewViewModel()

  useEffect(() => {
    cleanUpVerificationData()
  }, [cleanUpVerificationData])

  return (
    <SystemModal
      headerText={t('BCSC.CancelledVerification.Title')}
      contentText={[
        t('BCSC.CancelledVerification.Label', {
          reason: agentReason ?? t('BCSC.CancelledVerification.NoReason'),
          interpolation: { escapeValue: false }, // this allows special characters to be rendered properly
        }),
      ]}
      buttonText={t('BCSC.CancelledVerification.Button')}
      onButtonPress={() => {
        cleanUpVerificationData()
        navigation.reset({ index: 0, routes: [{ name: BCSCScreens.VerificationMethodSelection }] })
      }}
    />
  )
}

export default CancelledReview
