import { useTheme } from '@bifold/core'
import React, { PropsWithChildren } from 'react'
import { ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

interface TabScreenWrapperProps extends PropsWithChildren {
  edges?: ('top' | 'left' | 'right' | 'bottom')[]
}

const TabScreenWrapper: React.FC<TabScreenWrapperProps> = ({ edges = ['top', 'left', 'right' ], children }) => {
  const { ColorPalette } = useTheme()

  return (
    <SafeAreaView
      edges={edges}
      style={{ flex: 1, backgroundColor: ColorPalette.brand.primaryBackground }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>{children}</ScrollView>
    </SafeAreaView>
  )
}

export default TabScreenWrapper
