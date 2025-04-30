import { useTour } from '@bifold/core'
import { createStackNavigator } from '@react-navigation/stack'
import React, { useMemo } from 'react'
import { View } from 'react-native'

import { BCSCStacks } from '../types/navigators'
import BCSCTabStack from './TabStack'

const MainStack: React.FC = () => {
  const { currentStep } = useTour()

  const Stack = createStackNavigator()
  const hideElements = useMemo(() => (currentStep === undefined ? 'auto' : 'no-hide-descendants'), [currentStep])

  return (
    <View style={{ flex: 1 }} importantForAccessibility={hideElements}>
      <Stack.Navigator initialRouteName={BCSCStacks.TabStack} screenOptions={{ headerShown: false }}>
        <Stack.Screen name={BCSCStacks.TabStack} component={BCSCTabStack} />
      </Stack.Navigator>
    </View>
  )
}

export default MainStack
