import React, { useEffect } from 'react'

import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, BCState } from '@/store'
import { useStore } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { SystemModal } from '../../modal/components/SystemModal'

interface CancelledReviewProps {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.CancelledReview>
  route: {
    params: {
      agentReason?: string
    }
  }
}

const CancelledReview = ({ navigation, route }: CancelledReviewProps) => {
  const { agentReason } = route.params
  const { t } = useTranslation()
  const [, dispatch] = useStore<BCState>()
  const { updateAccountFlags } = useSecureActions()

  useEffect(() => {
    dispatch({ type: BCDispatchAction.RESET_SEND_VIDEO })
    dispatch({
      type: BCDispatchAction.UPDATE_SECURE_USER_SUBMITTED_VERIFICATION_VIDEO,
      payload: [false],
    })
    updateAccountFlags({ userSubmittedVerificationVideo: false })
  }, [dispatch, updateAccountFlags])

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
        navigation.goBack()
      }}
    />
  )
}

export default CancelledReview
