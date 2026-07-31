import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { useVerificationReset } from '@/bcsc-theme/hooks/useVerificationReset'
import { TOKENS, useServices } from '@bifold/core'
import React, { useEffect, useState } from 'react'
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
  const { cleanUpVerificationData, goToMethodSelection } = useCancelledReviewViewModel()
  const [isLoading, setIsLoading] = useState(false)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const loadingScreen = useLoadingScreen()

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
        setIsLoading(true)
        const stopLoading = loadingScreen.startLoading(t('Alerts.RestartVerification.Loading'))
        try {
          // Clear everything related to verification so it appears as if the user has never started the process before
          const success = await verificationReset()
          if (success) {
            // goBack() would no-op: clearing verified status unmounts the stack hosting
            // this screen mid-reset (#4387). Re-enter the verify flow via store state.
            goToMethodSelection()
            return
          }
          setIsLoading(false)
        } catch (error) {
          logger.error('CancelledReview: Error during factory reset on account', error as Error)
          setIsLoading(false)
        } finally {
          stopLoading()
        }
      }}
    />
  )
}

export default CancelledReview
