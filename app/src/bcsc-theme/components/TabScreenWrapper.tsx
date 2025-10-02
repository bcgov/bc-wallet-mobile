import { useTheme } from '@bifold/core'
import React, { ComponentProps, PropsWithChildren } from 'react'
import { ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

interface TabScreenWrapperProps extends PropsWithChildren {
  edges?: ('top' | 'left' | 'right' | 'bottom')[]
  scrollViewProps?: ComponentProps<typeof ScrollView>
}

const TabScreenWrapper: React.FC<TabScreenWrapperProps> = ({
  edges = ['left', 'right'],
  children,
  scrollViewProps,
}) => {
  const { ColorPalette } = useTheme()

  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: ColorPalette.brand.primaryBackground }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} {...scrollViewProps}>
        {children}
      </ScrollView>
    </SafeAreaView>
  )
}

export default TabScreenWrapper
