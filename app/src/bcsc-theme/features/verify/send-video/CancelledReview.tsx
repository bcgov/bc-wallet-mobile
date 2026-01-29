import { useNavigation } from '@react-navigation/native'
import React, { useEffect } from 'react'

import { BCDispatchAction, BCState } from '@/store'
import { useStore } from '@bifold/core'
import { SystemModal } from '../../modal/components/SystemModal'

interface CancelledReviewProps {
  route: {
    params: {
      agentReason?: string
    }
  }
}

const CancelledReview = ({ route }: CancelledReviewProps) => {
  const { agentReason } = route.params
  const navigation = useNavigation()
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
