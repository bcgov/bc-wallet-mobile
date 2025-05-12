import { useTour } from '@bifold/core'
import { createStackNavigator } from '@react-navigation/stack'
import React, { useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'

import { BCSCStacks } from '../types/navigators'
import BCSCTabStack from './TabStack'
import { AppBanner, AppBannerSectionProps } from '../components/AppBanner'
import { getServerStatus } from '@/api/services/utility.service'

const MainStack: React.FC = () => {
  const { currentStep } = useTour()
  const [messages, setMessages] = useState<AppBannerSectionProps[]>([])
  const Stack = createStackNavigator()
  const hideElements = useMemo(() => (currentStep === undefined ? 'auto' : 'no-hide-descendants'), [currentStep])

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await getServerStatus()
        if ((response?.data as any).status === 'ok') {
          setMessages([
            {
              title: 'IAS Server is reachable',
              type: 'success',
            },
          ])
        }
      } catch (error) {
        setMessages([
          {
            title: 'IAS Server is unreachable',
            type: 'error',
            details: 'Please try again later.',
            dismissible: false,
          },
        ])
      }
    }

    fetchMessages()
  }, [])

  return (
    <View style={{ flex: 1 }} importantForAccessibility={hideElements}>
      <AppBanner messages={messages} />
      <Stack.Navigator initialRouteName={BCSCStacks.TabStack} screenOptions={{ headerShown: false }}>
        <Stack.Screen name={BCSCStacks.TabStack} component={BCSCTabStack} />
      </Stack.Navigator>
    </View>
  )
}

export default MainStack
