import React from 'react'

import NicknameForm from './components/NicknameForm'
import { SafeAreaView } from 'react-native-safe-area-context'

const EditNicknameScreen: React.FC = () => {
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1 }}>
      <NicknameForm isRenaming />
    </SafeAreaView>
  )
}

export default EditNicknameScreen
