import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { useVerificationReset } from '@/bcsc-theme/hooks/useVerificationReset'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { TOKENS, usePreventDoublePress, useServices } from '@bifold/core'
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
  const verificationReset = useVerificationReset()
  const { t } = useTranslation()
  const navigation = useNavigation<StackNavigationProp<BCSCVerifyStackParams>>()
  const { cleanUpVerificationData, goToMethodSelection } = useCancelledReviewViewModel()
  const { preventDoublePress, isPressing } = usePreventDoublePress()
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
      buttonDisabled={isPressing}
      onButtonPress={preventDoublePress(async () => {
        const stopLoading = loadingScreen.startLoading(t('Alerts.RestartVerification.Loading'))
        try {
          const success = await verificationReset()
          if (success) {
            goToMethodSelection()
            // goToMethodSelection sets store state for the RootStack swap, but on iOS the
            // VerifyStack may not unmount/remount reliably — navigate explicitly so the user
            // always leaves this screen. The reset cleared all ID/email/address data, so
            // IdentitySelection (step 1) is the correct resume point.
            navigation.reset({ index: 0, routes: [{ name: BCSCScreens.IdentitySelection }] })
          }
        } catch (error) {
          logger.error('CancelledReview: Error during factory reset on account', error as Error)
        } finally {
          stopLoading()
        }
      })}
    />
  )
}

export default CancelledReview
