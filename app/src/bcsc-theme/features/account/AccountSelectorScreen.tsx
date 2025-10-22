import React from 'react'

import AccountSelector from './components/AccountSelector'
import { SafeAreaView } from 'react-native-safe-area-context'

const AccountSelectorScreen: React.FC = () => {
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1 }}>
      <AccountSelector />
    </SafeAreaView>
  )
}

export default AccountSelectorScreen
