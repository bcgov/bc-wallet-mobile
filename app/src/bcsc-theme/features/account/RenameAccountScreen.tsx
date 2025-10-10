import { useAgent } from '@credo-ts/react-hooks'
import { useNavigation } from '@react-navigation/native'
import React, { useCallback } from 'react'

import NicknameForm from './components/NicknameForm'

const RenameAccount: React.FC = () => {
  const navigation = useNavigation()
  const { agent } = useAgent()

  const onCancel = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  const onSubmitSuccess = useCallback(
    (name: string) => {
      agent.config.label = name
      navigation.goBack()
    },
    [navigation, agent]
  )

  return <NicknameForm isRenaming onCancel={onCancel} onSubmitSuccess={onSubmitSuccess} />
}

export default RenameAccount
