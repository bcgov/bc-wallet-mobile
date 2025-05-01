import { useTheme } from '@bifold/core'
import React, { PropsWithChildren } from 'react'
import { ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const TabScreenWrapper: React.FC<PropsWithChildren> = ({ children }) => {
  const { ColorPallet } = useTheme()

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: ColorPallet.brand.primaryBackground }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>{children}</ScrollView>
    </SafeAreaView>
  )
}

export default TabScreenWrapper
