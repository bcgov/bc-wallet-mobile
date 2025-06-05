import { ButtonLocation, IconButton, testIdWithKey, useTour } from '@bifold/core'
import { createStackNavigator } from '@react-navigation/stack'
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import { getServerStatus } from '@/api/services/utility.service'
import { AppBanner, AppBannerSectionProps } from '../components/AppBanner'
import ManualPairingCode from '../features/pairing/ManualPairing'
import PairingConfirmation from '../features/pairing/PairingConfirmation'
import { BCSCScreens, BCSCStacks } from '../types/navigators'
import BCSCTabStack from './TabStack'

const MainStack: React.FC = () => {
  const { t } = useTranslation()
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
            title: `IAS Server is unreachable: ${(error as Error).message}`,
            type: 'error',
            dismissible: false,
          },
        ])
      }
    }

    fetchMessages()
  }, [])

  const iconButton = () => (
    <IconButton
      buttonLocation={ButtonLocation.Right}
      accessibilityLabel={t('Global.Help')}
      testID={testIdWithKey('Help')}
      onPress={() => {
        // TODO: Implement help functionality
      }}
      icon={'help-circle-outline'}
    />
  )
  return (
    <View style={{ flex: 1 }} importantForAccessibility={hideElements}>
      <AppBanner messages={messages} />
      <Stack.Navigator initialRouteName={BCSCStacks.TabStack} screenOptions={{ headerShown: false }}>
        <Stack.Screen name={BCSCStacks.TabStack} component={BCSCTabStack} />
        <Stack.Screen
          name={BCSCScreens.ManualPairingCode}
          component={ManualPairingCode}
          options={() => ({
            headerShown: true,
            title: '',
            headerBackTitleVisible: false,
            headerBackTestID: testIdWithKey('Back'),
            headerRight: iconButton,
          })}
        />
        <Stack.Screen
          name={BCSCScreens.PairingConfirmation}
          component={PairingConfirmation}
          options={() => ({
            headerShown: true,
            title: '',
            headerLeft: () => null,
          })}
        />
      </Stack.Navigator>
    </View>
  )
}

export default MainStack
