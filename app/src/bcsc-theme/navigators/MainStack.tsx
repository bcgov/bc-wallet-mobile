import { ButtonLocation, IconButton, testIdWithKey, useTour } from '@bifold/core'
import { createStackNavigator } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import { AppBanner } from '../components/AppBanner'
import React, { useMemo } from 'react'

import ManualPairingCode from '../features/pairing/ManualPairing'
import PairingConfirmation from '../features/pairing/PairingConfirmation'
import { BCSCScreens, BCSCStacks } from '../types/navigators'
import BCSCTabStack from './TabStack'

const MainStack: React.FC = () => {
  const { t } = useTranslation()
  const { currentStep } = useTour()
  const Stack = createStackNavigator()
  const hideElements = useMemo(() => (currentStep === undefined ? 'auto' : 'no-hide-descendants'), [currentStep])

  const headerRight = () => (
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
      <AppBanner messages={[]} />
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
            headerRight,
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
