import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { useVerificationReset } from '@/bcsc-theme/hooks/useVerificationReset'
import { TOKENS, useServices } from '@bifold/core'
import React, { useEffect, useRef, useState } from 'react'
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
  const verificationReset = useVerificationReset()
  const { t } = useTranslation()
  const { cleanUpVerificationData, goToMethodSelection } = useCancelledReviewViewModel()
  const [isLoading, setIsLoading] = useState(false)
  const resettingRef = useRef(false)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const loadingScreen = useLoadingScreen()

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
      buttonDisabled={isLoading}
      onButtonPress={async () => {
        if (resettingRef.current) { return }
        resettingRef.current = true
        setIsLoading(true)
        const stopLoading = loadingScreen.startLoading(t('Alerts.RestartVerification.Loading'))
        try {
          const success = await verificationReset()
          if (success) {
            // goBack() no-ops here: the reset unmounts this screen's stack mid-flight (#4387)
            goToMethodSelection()
            return
          }
          resettingRef.current = false
          setIsLoading(false)
        } catch (error) {
          logger.error('CancelledReview: Error during factory reset on account', error as Error)
          resettingRef.current = false
          setIsLoading(false)
        } finally {
          stopLoading()
        }
      }}
    />
  )
}

export default CancelledReview
