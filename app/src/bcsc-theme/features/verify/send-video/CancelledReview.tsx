import React, { useEffect } from 'react'

import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, BCState } from '@/store'
import { useStore } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
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
  const [_, dispatch] = useStore<BCState>()

  useEffect(() => {
    dispatch({ type: BCDispatchAction.RESET_SEND_VIDEO })
    dispatch({
      type: BCDispatchAction.UPDATE_SECURE_USER_SUBMITTED_VERIFICATION_VIDEO,
      payload: [undefined],
    })
  }, [])

  return (
    <SystemModal
      headerText="Your identity couldn't be verified"
      contentText={[`Details from Service BC agent: \n ${agentReason ?? 'No reason provided'}`]}
      buttonText="OK"
      onButtonPress={() => {
        navigation.goBack()
      }}
    />
  )
}

export default CancelledReview
