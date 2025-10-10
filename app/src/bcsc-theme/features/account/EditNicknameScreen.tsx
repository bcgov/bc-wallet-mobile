import { useNavigation } from '@react-navigation/native'
import React, { useCallback } from 'react'

import NicknameForm from './components/NicknameForm'

const EditNicknameScreen: React.FC = () => {
  const navigation = useNavigation()

  const onCancel = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  return <NicknameForm isRenaming onCancel={onCancel} />
}

export default EditNicknameScreen
