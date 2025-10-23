import React from 'react'

import NicknameForm from './components/NicknameForm'
import { SafeAreaView } from 'react-native-safe-area-context'

const NicknameAccount: React.FC = () => {
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1 }}>
      <NicknameForm />
    </SafeAreaView>
  )
}

export default NicknameAccount
