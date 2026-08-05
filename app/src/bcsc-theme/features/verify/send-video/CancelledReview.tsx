import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { useVerificationReset } from '@/bcsc-theme/hooks/useVerificationReset'
import { usePreventDoublePress } from '@bifold/core'
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
  const verificationReset = useVerificationReset()
  const { t } = useTranslation()
  const { cleanUpVerificationData, resumeVerification } = useCancelledReviewViewModel()
  const { preventDoublePress, isPressing } = usePreventDoublePress()
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
      buttonDisabled={isPressing}
      onButtonPress={preventDoublePress(async () => {
        const stopLoading = loadingScreen.startLoading(t('Alerts.RestartVerification.Loading'))
        try {
          // Reports failure by returning false (it shows its own factory-reset alert), never by
          // throwing — so there is nothing here to catch.
          const success = await verificationReset()
          if (success) {
            // Each stack registers this screen under its own route name, so the swap RootStack
            // performs on this state change drops the inherited route and lands the user on the
            // incoming stack's initialRouteName. An in-stack navigation cannot do that.
            resumeVerification()
          }
        } finally {
          stopLoading()
        }
      })}
    />
  )
}

export default CancelledReview
