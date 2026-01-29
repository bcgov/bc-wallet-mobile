import { useNavigation } from '@react-navigation/native'
import React, { useEffect } from 'react'

import { BCDispatchAction, BCState } from '@/store'
import { useStore } from '@bifold/core'
import { SystemModal } from '../../modal/components/SystemModal'

const CancelledReview: React.FC<{ agent_reason?: string }> = ({ agent_reason }) => {
  const navigation = useNavigation()
  const [_, dispatch] = useStore<BCState>()

  useEffect(() => {
    dispatch({ type: BCDispatchAction.RESET_SEND_VIDEO })
  }, [])

  return (
    <SystemModal
      headerText="Your identity couldn't be verified"
      contentText={[`Details from Service BC agent: ${agent_reason ?? 'No reason provided'}`]}
      buttonText="OK"
      onButtonPress={() => {
        navigation.goBack()
      }}
    />
  )
}

export default CancelledReview
