import { useVerificationReset } from '@/bcsc-theme/hooks/useVerificationReset'
import { useNavigation } from '@react-navigation/native'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SystemModal } from '../../modal/components/SystemModal'
import useCancelledReviewViewModel from './CancelledRerivewViewModel'
interface CancelledReviewProps {
  route: {
    params: {
      agentReason?: string
    }
  }
}
/**
 * A SystemModal wrapper that displays a cancellation message when a video verification request is cancelled.
 * This component will also clean up related values (video path, metadata, prompts, etc.) from the store.
 *
 * @param agentReason - A reason provided by the reviewing agent on why the verification request was cancelled
 * @returns
 */
const CancelledReview = ({ route }: CancelledReviewProps) => {
  const { agentReason } = route.params
  const verificationReset = useVerificationReset()
  const { t } = useTranslation()
  const navigation = useNavigation()
  const { cleanUpVerificationData } = useCancelledReviewViewModel()
  const [isLoading, setLoading] = useState(false)

  useEffect(() => {
    // This clears up verification request artifacts (images, address data ect.)
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
      buttonDisabled={isLoading}
      onButtonPress={async () => {
        setLoading(true)
        // Clear everything related to verification so it appears as if the user has never started the process before
        await verificationReset()
        navigation.goBack()
      }}
    />
  )
}

export default CancelledReview
