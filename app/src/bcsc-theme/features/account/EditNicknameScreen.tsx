import { useNavigation } from '@react-navigation/native'
import React, { useCallback } from 'react'

import NicknameForm from './components/NicknameForm'
import { SafeAreaView } from 'react-native-safe-area-context'

const EditNicknameScreen: React.FC = () => {
  const navigation = useNavigation()

  const onCancel = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  return (
    <SafeAreaView edges={['bottom', 'left', 'right', 'top']} style={{ flex: 1 }}>
      <NicknameForm isRenaming onCancel={onCancel} />
    </SafeAreaView>
  )
}

export default EditNicknameScreen
